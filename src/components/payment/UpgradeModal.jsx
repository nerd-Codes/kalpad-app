// src/components/payment/UpgradeModal.jsx
"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  IconArrowRight,
  IconCheck,
  IconCrown,
  IconDiamond,
  IconLockOpen,
  IconRocket,
  IconX,
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { notifications } from '@mantine/notifications';
import { PayURedirector } from './PayURedirector';
import classes from './UpgradeModal.module.css';

const TIERS = [
  {
    id: 'pro_15',
    name: 'The Sprint',
    duration: '15 days',
    price: '₹49',
    icon: IconRocket,
    surface: 'var(--kp-butter)',
    features: [
      'Unlimited active study plans',
      'Unlimited study note generation',
      '15 days full desk access',
    ],
  },
  {
    id: 'pro_30',
    name: 'The Marathon',
    duration: '30 days',
    price: '₹79',
    icon: IconDiamond,
    surface: 'var(--kp-mint)',
    features: [
      'Everything in Sprint',
      'Unlimited AI tutor chat',
      'Unlimited smart quizzes',
    ],
  },
  {
    id: 'pro_90',
    name: 'The Semester',
    duration: '3 months',
    price: '₹129',
    icon: IconCrown,
    surface: 'var(--kp-periwinkle)',
    features: [
      'Everything in Marathon',
      'Early access to YouTube lecture scout',
      'Long-term revision & cram support',
    ],
    recommended: true,
  },
];

export function UpgradeModal({ opened, onClose }) {
  const [selectedPlan, setSelectedPlan] = useState('pro_90');
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    if (!opened) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opened, loading, onClose]);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payment/initiate-payu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Payment initiation failed');
      }

      const data = await response.json();
      setPaymentData(data);
    } catch (error) {
      console.error(error);
      notifications.show({
        title: 'Gateway Error',
        message: error.message,
        color: 'red',
      });
      setLoading(false);
    }
  };

  const activeTier = TIERS.find((t) => t.id === selectedPlan) || TIERS[2];

  const modalContent = (
    <AnimatePresence>
      {opened && (
        <motion.div
          className={classes.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => {
            if (!loading) onClose?.();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Upgrade KalPad study pass"
            className={classes.dialog}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={classes.headerRow}>
              <div>
                <p className={classes.eyebrow}>Study Pass</p>
                <h2 className={classes.title}>Unlock your full study desk</h2>
                <p className={classes.subtitle}>
                  Remove plan, note, and AI tutor caps across your active exam timeline.
                </p>
              </div>
              <button
                type="button"
                className={classes.closeBtn}
                onClick={onClose}
                aria-label="Close upgrade dialog"
                disabled={loading}
              >
                <IconX size={18} stroke={1.9} />
              </button>
            </div>

            {/* Free Tier Limits Notice */}
            <div className={classes.limitBanner}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '11px',
                    backgroundColor: 'var(--kp-apricot)',
                    color: 'var(--kp-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconLockOpen size={17} stroke={1.9} />
                </span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--kp-ink)' }}>
                    Current plan: Free tier
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--kp-secondary)' }}>
                    Upgrade anytime for one-off pass access with zero recurring auto-debits.
                  </div>
                </div>
              </div>
              <div className={classes.limitChips}>
                <span className={classes.limitChip}>1 active plan</span>
                <span className={classes.limitChip}>Today notes only</span>
                <span className={classes.limitChip}>Capped quizzes</span>
              </div>
            </div>

            {/* 3 Pass Cards */}
            <div className={classes.tierGrid} role="radiogroup" aria-label="Select a study pass">
              {TIERS.map((tier) => {
                const Icon = tier.icon;
                const isSelected = selectedPlan === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedPlan(tier.id)}
                    className={`${classes.tierCard} ${isSelected ? classes.tierCardSelected : ''}`}
                    style={{
                      backgroundColor: tier.surface,
                      border: isSelected
                        ? '2px solid var(--kp-primary)'
                        : '1px solid var(--kp-border)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className={classes.tierTopRow}>
                        <span className={classes.tierIconChip}>
                          <Icon size={18} stroke={1.9} />
                        </span>
                        {tier.recommended ? (
                          <span className={classes.recommendedBadge}>Best value</span>
                        ) : (
                          isSelected && (
                            <span
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '999px',
                                backgroundColor: 'var(--kp-primary)',
                                color: 'var(--kp-on-primary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <IconCheck size={13} stroke={2.4} />
                            </span>
                          )
                        )}
                      </div>

                      <div>
                        <div className={classes.tierName}>{tier.name}</div>
                        <div className={classes.tierPriceRow}>
                          <span className={classes.tierPrice}>{tier.price}</span>
                          <span className={classes.tierDuration}>/ {tier.duration}</span>
                        </div>
                      </div>
                    </div>

                    <ul className={classes.featureList}>
                      {tier.features.map((feat) => (
                        <li key={feat} className={classes.featureItem}>
                          <span className={classes.featureCheck}>
                            <IconCheck size={10} stroke={2.6} />
                          </span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            {/* Footer Checkout Bar */}
            <div className={classes.checkoutBar}>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-kp-mono)',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--kp-secondary)',
                  }}
                >
                  Total due · {activeTier.name} ({activeTier.duration})
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-kp-mono)',
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'var(--kp-ink)',
                    fontVariantNumeric: 'tabular-nums',
                    marginTop: '2px',
                  }}
                >
                  {activeTier.price}
                </div>
              </div>

              <button
                type="button"
                className={classes.checkoutBtn}
                onClick={handlePurchase}
                disabled={loading}
              >
                <span>{loading ? 'Preparing checkout...' : 'Continue to checkout'}</span>
                {!loading && <IconArrowRight size={16} stroke={2.1} />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent}
      <PayURedirector paymentData={paymentData} />
    </>
  );
}
