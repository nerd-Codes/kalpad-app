// src/app/plans/page.js
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import {
  IconAlertTriangle,
  IconArchive,
  IconArrowRight,
  IconArrowsSort,
  IconBolt,
  IconBrain,
  IconCalendar,
  IconChartHistogram,
  IconCheck,
  IconChevronDown,
  IconPlayerPlayFilled,
  IconPlus,
  IconTargetArrow,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import supabase from '@/lib/supabaseClient';
import { useLoading } from '@/context/LoadingContext';
import KalPadShell from '@/components/kalpad/KalPadShell';
import { KalPadProgress } from '@/components/kalpad/KalPadProgress';
import classes from '@/components/plans/Plans.module.css';

const PLAN_PASTELS = [
  'var(--kp-butter)',
  'var(--kp-mint)',
  'var(--kp-periwinkle)',
  'var(--kp-apricot)',
  'var(--kp-sky)',
];

const PLAN_ICONS = [
  IconTargetArrow,
  IconBrain,
  IconCalendar,
  IconBolt,
  IconChartHistogram,
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'progress', label: 'Progress' },
];

function computePlanMetrics(plan) {
  let totalTasks = 0;
  let doneTasks = 0;
  (plan.plan_topics || []).forEach((t) => {
    if (Array.isArray(t.sub_topics)) {
      totalTasks += t.sub_topics.length;
      doneTasks += t.sub_topics.filter((s) => s.completed).length;
    }
  });
  const progress =
    totalTasks === 0 ? 0 : Math.max(0, Math.min(100, Math.round((doneTasks / totalTasks) * 100)));
  return { totalTasks, doneTasks, progress };
}

function getBentoSlotClass(idx, total) {
  // Smallest (< 640px): 2 columns — asymmetric [2, 1, 1]
  const smPos = idx % 3;
  const smRem = total - Math.floor(idx / 3) * 3;
  const smClass = smRem >= 3 && smPos === 0 ? classes.smSpan2 : total === 1 ? classes.smSpan2 : classes.smSpan1;

  // Medium (640px - 1039px): 3 columns — asymmetric cycle of 5: [2, 1] + [1, 1, 1]
  const mdPos = idx % 5;
  const mdRem = total - Math.floor(idx / 5) * 5;
  let mdClass = classes.mdSpan1;
  if (total === 1) mdClass = classes.mdSpan2;
  else if (mdRem === 2 && mdPos === 0) mdClass = classes.mdSpan2;
  else if (mdRem >= 2 && mdPos === 0) mdClass = classes.mdSpan2;

  // Laptop (1040px - 1359px): 4 columns — asymmetric cycle of 10:
  // [2, 1, 1] (3 cards) + [1, 1, 1, 1] (4 cards) + [1, 1, 2] (3 cards)
  const lgPos = idx % 10;
  let lgClass = classes.lgSpan1;
  if (total === 2 && idx === 0) lgClass = classes.lgSpan2;
  else if (lgPos === 0 || lgPos === 9) lgClass = classes.lgSpan2;

  // Large Desktop (1360px - 1679px): 5 columns — asymmetric cycle of 13:
  // [2, 1, 1, 1] (4 cards) + [1, 1, 1, 1, 1] (5 cards) + [1, 1, 1, 2] (4 cards)
  const xlPos = idx % 13;
  let xlClass = classes.xlSpan1;
  if (total <= 3 && idx === 0) xlClass = classes.xlSpan2;
  else if (xlPos === 0 || xlPos === 12) xlClass = classes.xlSpan2;

  // Ultra-Wide (>= 1680px): 6 columns — asymmetric cycle of 16:
  // [2, 1, 1, 1, 1] (5 cards) + [1, 1, 1, 1, 1, 1] (6 cards) + [1, 1, 1, 1, 2] (5 cards)
  const xxlPos = idx % 16;
  let xxlClass = classes.xxlSpan1;
  if (total <= 4 && idx === 0) xxlClass = classes.xxlSpan2;
  else if (xxlPos === 0 || xxlPos === 15) xxlClass = classes.xxlSpan2;

  return `${classes.tileSlot} ${smClass} ${mdClass} ${lgClass} ${xlClass} ${xxlClass}`;
}

function PlanTile({
  plan,
  ordinal,
  archived = false,
  selectionMode = false,
  selected = false,
  onClick,
}) {
  const tileColor = archived
    ? 'var(--kp-raised)'
    : PLAN_PASTELS[((ordinal % PLAN_PASTELS.length) + PLAN_PASTELS.length) % PLAN_PASTELS.length];
  const IconComp = archived
    ? IconArchive
    : PLAN_ICONS[((ordinal % PLAN_ICONS.length) + PLAN_ICONS.length) % PLAN_ICONS.length];

  let examDateText = plan.exam_date || '';
  if (plan.exam_date) {
    const parsed = parseISO(plan.exam_date);
    if (!Number.isNaN(parsed.getTime())) {
      examDateText = format(parsed, 'MMM d, yyyy');
    }
  }

  let statusPillText = 'Unscheduled';
  if (archived) {
    statusPillText = 'Archived';
  } else if (plan.daysLeft !== null) {
    if (plan.daysLeft < 0) statusPillText = 'Past';
    else if (plan.daysLeft === 0) statusPillText = 'Today';
    else if (plan.daysLeft === 1) statusPillText = '1d left';
    else statusPillText = `${plan.daysLeft}d left`;
  }

  const tasksSummary =
    plan.totalTasks > 0
      ? `${plan.doneTasks}/${plan.totalTasks} · ${plan.progress}%`
      : `${plan.progress}%`;

  return (
    <button
      type="button"
      onClick={onClick}
      role={selectionMode ? 'checkbox' : 'button'}
      aria-checked={selectionMode ? selected : undefined}
      className={classes.planTile}
      style={{
        backgroundColor: tileColor,
        border: selected ? '2px solid var(--kp-ink)' : '1px solid var(--kp-border)',
      }}
    >
      {/* Compact Header: Icon + Status Pill + Action */}
      <div className={classes.tileHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span
            className={classes.tileIconChip}
            style={{
              backgroundColor: 'var(--kp-surface)',
              border: '1px solid var(--kp-border)',
              color: archived ? 'var(--kp-secondary)' : 'var(--kp-ink)',
            }}
          >
            <IconComp size={16} stroke={1.85} />
          </span>
          <span className={classes.tileStatusPill}>{statusPillText}</span>
        </div>

        {selectionMode ? (
          <span
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '7px',
              backgroundColor: selected ? 'var(--kp-primary)' : 'var(--kp-surface)',
              border: selected ? '1px solid var(--kp-primary)' : '1px solid var(--kp-border-strong)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--kp-on-primary)',
              flexShrink: 0,
            }}
          >
            {selected && <IconCheck size={12} stroke={2.4} />}
          </span>
        ) : (
          <IconArrowRight size={16} stroke={1.85} color="var(--kp-secondary)" style={{ flexShrink: 0 }} />
        )}
      </div>

      {/* Uniform Title */}
      <h3 className={classes.tileTitle}>{plan.exam_name}</h3>

      {/* Prominent Stats & Progress */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className={classes.tileMetrics}>
          <div className={classes.metricRow}>
            <span className={classes.metricLabel}>Exam</span>
            <span className={classes.metricValue}>{examDateText || 'Not set'}</span>
          </div>
          <div className={classes.metricRow}>
            <span className={classes.metricLabel}>Done</span>
            <span className={classes.metricValue} style={{ fontFamily: 'var(--font-kp-mono)' }}>
              {tasksSummary}
            </span>
          </div>
        </div>

        <KalPadProgress progress={plan.progress / 100} height={5} />
      </div>
    </button>
  );
}

function PlansBentoGrid({
  plans,
  archived = false,
  selectionMode = false,
  selectedIds,
  onPlanClick,
}) {
  return (
    <div className={classes.bentoGrid}>
      {plans.map((plan, idx) => (
        <motion.div
          key={plan.id}
          className={getBentoSlotClass(idx, plans.length)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.22,
            delay: Math.min(idx * 0.025, 0.22),
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <PlanTile
            plan={plan}
            ordinal={idx}
            archived={archived}
            selectionMode={selectionMode}
            selected={selectedIds.has(plan.id)}
            onClick={() => onPlanClick(plan)}
          />
        </motion.div>
      ))}
    </div>
  );
}

export default function AllPlansPage() {
  const router = useRouter();
  const { setIsLoading } = useLoading();

  const [session, setSession] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sortOrder, setSortOrder] = useState('newest');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPlanIds, setSelectedPlanIds] = useState(() => new Set());
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const sortWrapRef = useRef(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();
      setSession(activeSession);
      if (!activeSession) {
        setPlans([]);
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('study_plans')
        .select(`id, exam_name, exam_date, created_at, plan_topics ( sub_topics )`)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      setPlans(data || []);
    } catch (err) {
      setError(err?.message || "Couldn't refresh your plans. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    if (!sortMenuOpen) return;
    const handleOutside = (e) => {
      if (sortWrapRef.current && !sortWrapRef.current.contains(e.target)) {
        setSortMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [sortMenuOpen]);

  const { activePlans, pastPlans } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enriched = plans.map((p) => {
      const parsed = p.exam_date ? parseISO(p.exam_date) : null;
      const valid = parsed && !Number.isNaN(parsed.getTime());
      const daysLeft = valid ? differenceInCalendarDays(parsed, today) : null;
      const metrics = computePlanMetrics(p);
      return {
        ...p,
        ...metrics,
        daysLeft,
        isPast: daysLeft !== null && daysLeft < 0,
      };
    });

    const sorted = [...enriched].sort((a, b) => {
      if (sortOrder === 'urgent') {
        const aVal = a.daysLeft !== null ? a.daysLeft : Number.MAX_SAFE_INTEGER;
        const bVal = b.daysLeft !== null ? b.daysLeft : Number.MAX_SAFE_INTEGER;
        return aVal - bVal;
      }
      if (sortOrder === 'progress') {
        return b.progress - a.progress;
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    const active = sorted.filter((p) => !p.isPast);
    const past = sorted.filter((p) => p.isPast);

    return {
      activePlans: active,
      pastPlans: past,
    };
  }, [plans, sortOrder]);

  const handlePlanClick = (plan) => {
    if (selectionMode) {
      setSelectedPlanIds((prev) => {
        const next = new Set(prev);
        if (next.has(plan.id)) next.delete(plan.id);
        else next.add(plan.id);
        return next;
      });
      return;
    }
    setIsLoading(true);
    router.push(`/plan/${plan.id}`);
  };

  const handleToggleSelectionMode = () => {
    setSelectionMode((v) => !v);
    setSelectedPlanIds(new Set());
  };

  const handleArchiveSelected = async () => {
    const ids = Array.from(selectedPlanIds);
    if (ids.length === 0) return;
    setIsArchiving(true);
    setError('');
    try {
      const response = await fetch('/api/archive-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planIds: ids }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Could not archive selected plans.');
      }
      setPlans((prev) => prev.filter((p) => !selectedPlanIds.has(p.id)));
      setSelectedPlanIds(new Set());
      setSelectionMode(false);
      setShowArchiveConfirm(false);
      notifications.show({
        title: 'Moved to shelf',
        message: `${ids.length} study ${ids.length === 1 ? 'plan' : 'plans'} archived.`,
        color: 'teal',
      });
    } catch (err) {
      setError(err?.message || 'Could not archive selected plans.');
    } finally {
      setIsArchiving(false);
    }
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortOrder)?.label || 'Newest';

  return (
    <KalPadShell session={session} maxWidth="1560px">
      <div className={classes.pageWrap}>
        {/* Plans Intro */}
        <header style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-kp-mono)',
                  fontSize: '30px',
                  lineHeight: '36px',
                  fontWeight: 700,
                  letterSpacing: '-0.7px',
                  color: 'var(--kp-ink)',
                }}
              >
                Your plans
              </h1>
              <p
                style={{
                  margin: '2px 0 0 0',
                  fontFamily: 'var(--font-kp-sans)',
                  fontSize: '12px',
                  color: 'var(--kp-secondary)',
                }}
              >
                {activePlans.length} active  ·  {pastPlans.length} archived
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                router.push('/new-plan');
              }}
              className="kp-tactile"
              style={{
                border: 'none',
                borderRadius: '20px',
                backgroundColor: 'var(--kp-primary)',
                color: 'var(--kp-on-primary)',
                padding: '12px 14px',
                minHeight: '44px',
                fontFamily: 'var(--font-kp-sans)',
                fontSize: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <IconPlus size={18} stroke={1.9} />
              <span>New plan</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--kp-border-strong)' }} />
            <span
              style={{
                fontFamily: 'var(--font-kp-sans)',
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--kp-secondary)',
              }}
            >
              Make space for what matters
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--kp-border-strong)' }} />
          </div>
        </header>

        {/* Plans Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          {selectionMode ? (
            <>
              <span
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-kp-sans)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--kp-secondary)',
                }}
              >
                {selectedPlanIds.size} selected
              </span>
              <button
                type="button"
                disabled={selectedPlanIds.size === 0}
                onClick={() => setShowArchiveConfirm(true)}
                style={{
                  border: 'none',
                  borderRadius: '20px',
                  padding: '9px 14px',
                  minHeight: '40px',
                  backgroundColor:
                    selectedPlanIds.size > 0 ? 'var(--kp-primary)' : 'var(--kp-raised)',
                  color:
                    selectedPlanIds.size > 0 ? 'var(--kp-on-primary)' : 'var(--kp-secondary)',
                  fontFamily: 'var(--font-kp-sans)',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: selectedPlanIds.size > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                <IconArchive size={15} stroke={1.8} />
                <span>Archive</span>
              </button>
              <button
                type="button"
                onClick={handleToggleSelectionMode}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--kp-secondary)',
                  fontFamily: 'var(--font-kp-sans)',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '8px 12px',
                  minHeight: '40px',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </>
          ) : (
            <>
              <div ref={sortWrapRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setSortMenuOpen((o) => !o)}
                  aria-expanded={sortMenuOpen}
                  aria-haspopup="menu"
                  style={{
                    border: '1px solid var(--kp-border)',
                    borderRadius: '20px',
                    backgroundColor: 'var(--kp-raised)',
                    color: 'var(--kp-ink)',
                    padding: '9px 12px',
                    minHeight: '40px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    cursor: 'pointer',
                  }}
                >
                  <IconArrowsSort size={15} stroke={1.8} />
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>{currentSortLabel}</span>
                  <IconChevronDown size={13} stroke={1.8} color="var(--kp-secondary)" />
                </button>

                {sortMenuOpen && (
                  <div
                    role="menu"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      minWidth: '160px',
                      backgroundColor: 'var(--kp-surface)',
                      border: '1px solid var(--kp-border-strong)',
                      borderRadius: '16px',
                      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.16)',
                      padding: '6px',
                      zIndex: 50,
                    }}
                  >
                    {SORT_OPTIONS.map((opt) => {
                      const active = opt.value === sortOrder;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={() => {
                            setSortOrder(opt.value);
                            setSortMenuOpen(false);
                          }}
                          style={{
                            width: '100%',
                            height: '38px',
                            padding: '0 10px',
                            border: 'none',
                            borderRadius: '10px',
                            backgroundColor: active ? 'var(--kp-raised)' : 'transparent',
                            color: 'var(--kp-ink)',
                            fontFamily: 'var(--font-kp-sans)',
                            fontSize: '13px',
                            fontWeight: active ? 700 : 500,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                          }}
                        >
                          <span>{opt.label}</span>
                          {active && <IconCheck size={15} stroke={2} color="var(--kp-orange)" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleToggleSelectionMode}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--kp-secondary)',
                  fontFamily: 'var(--font-kp-sans)',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '8px 12px',
                  minHeight: '40px',
                  cursor: 'pointer',
                }}
              >
                Select
              </button>
            </>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div
            role="alert"
            style={{
              borderRadius: '20px',
              backgroundColor: 'var(--kp-error-subtle)',
              border: '1px solid var(--kp-error-ink)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <IconAlertTriangle size={18} stroke={1.8} color="var(--kp-error-ink)" />
            <span style={{ flex: 1, fontSize: '12px', color: 'var(--kp-ink)' }}>{error}</span>
            <button
              type="button"
              onClick={fetchPlans}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--kp-ink)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '6px 8px',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Content */}
        {loading && plans.length === 0 ? (
          <div style={{ padding: '64px 0', display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '999px',
                border: '2.5px solid var(--kp-border)',
                borderTopColor: 'var(--kp-orange)',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* Active Section: In motion */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <IconPlayerPlayFilled size={17} color="#477C55" />
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-kp-sans)',
                      fontSize: '17px',
                      fontWeight: 700,
                      color: 'var(--kp-ink)',
                    }}
                  >
                    In motion
                  </h2>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-kp-mono)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--kp-secondary)',
                  }}
                >
                  {String(activePlans.length).padStart(2, '0')}
                </span>
              </div>

              {activePlans.length === 0 ? (
                <div
                  style={{
                    borderRadius: '20px',
                    backgroundColor: 'var(--kp-periwinkle)',
                    border: '1px solid var(--kp-border)',
                    padding: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                  }}
                >
                  <span
                    style={{
                      borderRadius: '16px',
                      backgroundColor: 'var(--kp-surface)',
                      padding: '12px',
                      display: 'inline-flex',
                      color: 'var(--kp-ink)',
                    }}
                  >
                    <IconTargetArrow size={24} stroke={1.8} />
                  </span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-kp-sans)',
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'var(--kp-ink)',
                      }}
                    >
                      A clear desk awaits
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-kp-sans)',
                        fontSize: '12px',
                        lineHeight: '17px',
                        color: 'var(--kp-secondary)',
                      }}
                    >
                      Create a plan and turn the next goal into a steady path.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsLoading(true);
                        router.push('/new-plan');
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        padding: '4px 0',
                        width: 'fit-content',
                        color: 'var(--kp-ink)',
                        fontFamily: 'var(--font-kp-sans)',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      <span>Create your first plan</span>
                      <IconArrowRight size={15} stroke={1.9} />
                    </button>
                  </div>
                </div>
              ) : (
                <PlansBentoGrid
                  plans={activePlans}
                  archived={false}
                  selectionMode={selectionMode}
                  selectedIds={selectedPlanIds}
                  onPlanClick={handlePlanClick}
                />
              )}
            </section>

            {/* Archived / Past Section: On the shelf */}
            {pastPlans.length > 0 && (
              <section
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  marginTop: '6px',
                }}
              >
                <div style={{ height: '1px', backgroundColor: 'var(--kp-border-strong)' }} />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <IconArchive size={17} stroke={1.8} color="var(--kp-secondary)" />
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: 'var(--font-kp-sans)',
                        fontSize: '17px',
                        fontWeight: 700,
                        color: 'var(--kp-ink)',
                      }}
                    >
                      On the shelf
                    </h2>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-kp-mono)',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--kp-secondary)',
                    }}
                  >
                    {String(pastPlans.length).padStart(2, '0')}
                  </span>
                </div>

                <PlansBentoGrid
                  plans={pastPlans}
                  archived={true}
                  selectionMode={selectionMode}
                  selectedIds={selectedPlanIds}
                  onPlanClick={handlePlanClick}
                />
              </section>
            )}
          </>
        )}
      </div>

      {/* Archive Confirmation Dialog */}
      {showArchiveConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Archive selected plans"
          onClick={() => setShowArchiveConfirm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            backgroundColor: 'rgba(17, 19, 23, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '380px',
              borderRadius: '20px',
              backgroundColor: 'var(--kp-surface)',
              border: '1px solid var(--kp-border-strong)',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontFamily: 'var(--font-kp-sans)',
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--kp-ink)',
              }}
            >
              Archive selected plans
            </h3>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-kp-sans)',
                fontSize: '14px',
                lineHeight: '20px',
                color: 'var(--kp-secondary)',
              }}
            >
              Archive {selectedPlanIds.size} study plan(s)? They will move out of your active view.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setShowArchiveConfirm(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--kp-secondary)',
                  fontFamily: 'var(--font-kp-sans)',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '8px 14px',
                  minHeight: '40px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isArchiving || selectedPlanIds.size === 0}
                onClick={handleArchiveSelected}
                style={{
                  border: 'none',
                  borderRadius: '20px',
                  backgroundColor: 'var(--kp-primary)',
                  color: 'var(--kp-on-primary)',
                  fontFamily: 'var(--font-kp-sans)',
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: '8px 18px',
                  minHeight: '40px',
                  cursor: isArchiving ? 'wait' : 'pointer',
                }}
              >
                {isArchiving ? 'Archiving…' : 'Move to shelf'}
              </button>
            </div>
          </div>
        </div>
      )}
    </KalPadShell>
  );
}
