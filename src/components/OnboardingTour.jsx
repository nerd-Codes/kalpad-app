"use client";

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useOnboarding } from '@/context/OnboardingContext';
import onboardingSteps from '@/lib/onboardingSteps';
import { useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import classes from './OnboardingTour.module.css';

function findVisibleTarget(selector) {
  if (!selector || typeof document === 'undefined') return null;
  const nodes = Array.from(document.querySelectorAll(selector));
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { node, rect };
    }
  }
  return null;
}

function computePopoverCoords(rect, placement) {
  if (typeof window === 'undefined' || !rect) {
    return { top: 24, left: 24 };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardWidth = Math.min(336, vw - 32);
  const estimatedHeight = 196;
  const gap = 14;
  const margin = 16;

  let top = rect.bottom + gap;
  let left = rect.left;

  if (placement === 'right') {
    left = rect.right + gap;
    top = rect.top;
    if (left + cardWidth > vw - margin) {
      left = Math.max(margin, rect.left);
      top = rect.bottom + gap;
    }
  } else if (placement === 'top') {
    top = rect.top - estimatedHeight - gap;
    left = rect.left;
    if (top < margin) {
      top = rect.bottom + gap;
    }
  } else {
    top = rect.bottom + gap;
    left = rect.left;
  }

  // Keep popover neatly inside viewport on all screen sizes
  left = Math.min(Math.max(margin, left), Math.max(margin, vw - cardWidth - margin));
  top = Math.min(Math.max(margin, top), Math.max(margin, vh - estimatedHeight - margin));

  return { top, left };
}

export function OnboardingTour() {
  const { isTourActive, currentStep, nextStep, endTour, isPaused } = useOnboarding();
  const router = useRouter();
  const pathname = usePathname();
  const step = isTourActive ? onboardingSteps[currentStep] : null;

  const [targetRect, setTargetRect] = useState(null);
  const rafLoopRef = useRef(null);
  const spotlightRef = useRef(null);
  const popoverRef = useRef(null);

  useLayoutEffect(() => {
    if (!isTourActive || isPaused || !step || step.route !== pathname) {
      setTargetRect(null);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15;
    let retryTimer = null;
    let resizeObserver = null;
    let mutationObserver = null;

    const measureOnce = () => {
      const found = findVisibleTarget(step.target);
      if (!found) return null;
      const { rect } = found;
      setTargetRect((prev) => {
        if (
          prev &&
          Math.abs(prev.top - rect.top) < 0.5 &&
          Math.abs(prev.left - rect.left) < 0.5 &&
          Math.abs(prev.width - rect.width) < 0.5 &&
          Math.abs(prev.height - rect.height) < 0.5
        ) {
          return prev;
        }
        return {
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      });
      return found.node;
    };

    const runAnimatedSyncWindow = (durationMs = 420) => {
      if (rafLoopRef.current) cancelAnimationFrame(rafLoopRef.current);
      const start = performance.now();
      const tick = (now) => {
        if (cancelled) return;
        measureOnce();
        if (now - start < durationMs) {
          rafLoopRef.current = requestAnimationFrame(tick);
        }
      };
      rafLoopRef.current = requestAnimationFrame(tick);
    };

    const tryAttach = () => {
      if (cancelled) return;
      const node = measureOnce();
      if (node) {
        if (step.target === '#generate-plan-button' || step.target === '#save-plan-button') {
          node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => {
            measureOnce();
          });
          resizeObserver.observe(node);
          if (node.parentElement) resizeObserver.observe(node.parentElement);
        }

        if (typeof MutationObserver !== 'undefined') {
          mutationObserver = new MutationObserver((mutations) => {
            const hasExternalMutation = mutations.some((m) => {
              const t = m.target;
              if (spotlightRef.current && spotlightRef.current.contains(t)) return false;
              if (popoverRef.current && popoverRef.current.contains(t)) return false;
              return true;
            });
            if (hasExternalMutation) {
              runAnimatedSyncWindow(420);
            }
          });
          const navContainer = node.closest('aside') || node.parentElement || document.body;
          mutationObserver.observe(navContainer, {
            attributes: true,
            attributeFilter: ['class', 'style', 'data-collapsed', 'aria-expanded'],
            subtree: true,
          });
        }
      } else if (attempts < maxAttempts) {
        attempts += 1;
        retryTimer = setTimeout(tryAttach, 100);
      } else {
        setTargetRect(null);
      }
    };

    const handleViewportChange = () => {
      runAnimatedSyncWindow(300);
    };

    tryAttach();
    window.addEventListener('resize', handleViewportChange, { passive: true });
    window.addEventListener('scroll', handleViewportChange, { capture: true, passive: true });

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (rafLoopRef.current) cancelAnimationFrame(rafLoopRef.current);
      if (resizeObserver) resizeObserver.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, { capture: true });
    };
  }, [isTourActive, isPaused, step, pathname]);

  useEffect(() => {
    if (!isTourActive) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') endTour();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isTourActive, endTour]);

  if (!isTourActive || !step || !targetRect || isPaused) {
    return null;
  }

  const isLastStep = currentStep === onboardingSteps.length - 1;
  const placement = targetRect.left < 280 ? 'right' : step.placement;
  const coords = computePopoverCoords(targetRect, placement);
  const pad = 4;

  const handleNext = () => {
    if (isLastStep) {
      endTour();
      return;
    }

    const nextStepConfig = onboardingSteps[currentStep + 1];
    if (nextStepConfig && nextStepConfig.route !== pathname) {
      router.push(nextStepConfig.route);
    }

    nextStep();
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={spotlightRef}
        key={`spotlight-${currentStep}`}
        className={classes.spotlight}
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          top: targetRect.top - pad,
          left: targetRect.left - pad,
          width: targetRect.width + pad * 2,
          height: targetRect.height + pad * 2,
        }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.div
        ref={popoverRef}
        key={`popover-${currentStep}`}
        role="dialog"
        aria-label={step.title}
        className={classes.popover}
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          top: coords.top,
          left: coords.left,
        }}
        exit={{ opacity: 0, y: 6, scale: 0.97 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={classes.headerRow}>
          <span className={classes.stepTag}>
            Step {String(currentStep + 1).padStart(2, '0')} / {String(onboardingSteps.length).padStart(2, '0')}
          </span>
        </div>
        <h4 className={classes.title}>{step.title}</h4>
        <p className={classes.body}>{step.body}</p>
        {currentStep < onboardingSteps.length - 1 ? (
          <div className={classes.actions}>
            <button type="button" className={classes.skipBtn} onClick={endTour}>
              Skip
            </button>
            <button type="button" className={classes.nextBtn} onClick={handleNext}>
              Next
            </button>
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
