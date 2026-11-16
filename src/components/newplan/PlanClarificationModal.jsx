// src/components/newplan/PlanClarificationModal.jsx
"use client";

import React, { useState } from 'react';
import {
  IconArrowRight,
  IconBolt,
  IconCheck,
  IconFileText,
  IconFlask,
  IconMicrophone,
  IconSparkles,
  IconTargetArrow,
  IconX,
} from '@tabler/icons-react';

const EXAM_FORMATS = [
  {
    id: 'theory',
    label: 'Written Theory / Semester',
    description: 'Derivations, theorem proofs, diagrams & step-by-step numericals',
    icon: IconFileText,
    badge: 'Popular',
  },
  {
    id: 'viva',
    label: 'Viva / Oral Exam',
    description: 'Verbal articulation, examiner traps, formulas & physical reasoning',
    icon: IconMicrophone,
    badge: 'Oral Defense',
  },
  {
    id: 'practical',
    label: 'Practical / Lab Exam',
    description: 'Apparatus setups, step procedures, observation tables & error formulas',
    icon: IconFlask,
    badge: 'Lab Focus',
  },
  {
    id: 'mcq',
    label: 'MCQ / Competitive Exam',
    description: 'Speed shortcuts, elimination techniques & high-frequency question patterns',
    icon: IconBolt,
    badge: 'Speed / Drills',
  },
  {
    id: 'comprehensive',
    label: 'Comprehensive / Mixed',
    description: 'Balanced mastery across concepts, practice, derivations & recall',
    icon: IconTargetArrow,
    badge: 'All-Round',
  },
];

const PREPARATION_LEVELS = [
  {
    id: 'scratch',
    label: 'Starting from scratch',
    sub: 'Need foundational concepts and step-by-step progression',
  },
  {
    id: 'standard',
    label: 'Attended lectures / some prep',
    sub: 'Balanced revision, key derivations and targeted practice',
  },
  {
    id: 'cram',
    label: 'Cramming / High-Yield Rush',
    sub: '80/20 rule: focus 100% on guaranteed questions & high-ROI marks',
  },
];

export function PlanClarificationModal({
  opened,
  onClose,
  examName = '',
  hasSyllabus = false,
  onConfirm,
}) {
  const [selectedFormat, setSelectedFormat] = useState('theory');
  const [selectedLevel, setSelectedLevel] = useState('standard');
  const [priorityNote, setPriorityNote] = useState('');

  if (!opened) return null;

  const handleLaunch = () => {
    onConfirm({
      examFormat: selectedFormat,
      prepLevel: selectedLevel,
      priorityNote: priorityNote.trim(),
    });
  };

  const handleQuickLaunch = () => {
    onConfirm({
      examFormat: 'theory',
      prepLevel: 'standard',
      priorityNote: '',
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Calibrate study plan"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3500,
        backgroundColor: 'rgba(15, 17, 21, 0.65)',
        backdropFilter: 'blur(5px)',
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
          maxWidth: '580px',
          maxHeight: '90vh',
          borderRadius: '24px',
          backgroundColor: 'var(--kp-surface)',
          border: '1px solid var(--kp-border-strong)',
          color: 'var(--kp-ink)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeInScale 180ms ease-out',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--kp-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                backgroundColor: 'var(--kp-butter)',
                border: '1px solid var(--kp-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconSparkles size={18} stroke={1.8} color="var(--kp-orange)" />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-kp-mono)',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--kp-ink)',
                }}
              >
                Calibrate your plan
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--kp-secondary)', marginTop: '2px' }}>
                Tailoring strategy for &ldquo;{examName || 'Your Exam'}&rdquo;
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              border: '1px solid var(--kp-border)',
              backgroundColor: 'var(--kp-raised)',
              color: 'var(--kp-ink)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <IconX size={15} stroke={1.8} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div
          style={{
            padding: '20px 22px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {!hasSyllabus && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '14px',
                backgroundColor: 'var(--kp-mint)',
                border: '1px solid var(--kp-border)',
                fontSize: '12px',
                color: 'var(--kp-ink)',
                lineHeight: 1.45,
              }}
            >
              💡 <strong>Auto-Syllabus Active:</strong> No syllabus provided. KalPad will automatically research and expand the standard curriculum for <strong>{examName || 'this exam'}</strong>.
            </div>
          )}

          {/* Section 1: Exam Format */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--kp-ink)' }}>
              1. What is the target exam format?
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {EXAM_FORMATS.map((fmt) => {
                const IconComponent = fmt.icon;
                const isSelected = selectedFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setSelectedFormat(fmt.id)}
                    className="kp-tactile"
                    style={{
                      padding: '10px 12px',
                      borderRadius: '14px',
                      border: isSelected
                        ? '2px solid var(--kp-orange)'
                        : '1px solid var(--kp-border)',
                      backgroundColor: isSelected ? 'var(--kp-raised)' : 'var(--kp-canvas)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '11px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '9px',
                        backgroundColor: isSelected ? 'var(--kp-primary)' : 'var(--kp-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconComponent
                        size={17}
                        stroke={1.8}
                        color={isSelected ? 'var(--kp-orange)' : 'var(--kp-secondary)'}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: 'var(--kp-ink)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>{fmt.label}</span>
                        {fmt.badge && (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              backgroundColor: isSelected
                                ? 'var(--kp-butter)'
                                : 'var(--kp-border)',
                              color: 'var(--kp-ink)',
                            }}
                          >
                            {fmt.badge}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--kp-secondary)',
                          lineHeight: 1.35,
                          marginTop: '2px',
                        }}
                      >
                        {fmt.description}
                      </div>
                    </div>
                    {isSelected && (
                      <IconCheck size={16} stroke={2.2} color="var(--kp-orange)" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Preparation Level */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--kp-ink)' }}>
              2. Where are you starting from?
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '7px' }}>
              {PREPARATION_LEVELS.map((lvl) => {
                const isSelected = selectedLevel === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSelectedLevel(lvl.id)}
                    className="kp-tactile"
                    style={{
                      padding: '10px',
                      borderRadius: '14px',
                      border: isSelected
                        ? '2px solid var(--kp-orange)'
                        : '1px solid var(--kp-border)',
                      backgroundColor: isSelected ? 'var(--kp-raised)' : 'var(--kp-canvas)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--kp-ink)' }}>
                      {lvl.label}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--kp-secondary)', lineHeight: 1.3 }}>
                      {lvl.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Optional Priority Topics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--kp-secondary)' }}>
              Optional: Any chapters to heavily prioritize or skip?
            </span>
            <input
              type="text"
              value={priorityNote}
              onChange={(e) => setPriorityNote(e.target.value)}
              placeholder="e.g. Focus on Optics & Calculus, skip historical intro"
              style={{
                width: '100%',
                minHeight: '44px',
                padding: '10px 12px',
                borderRadius: '12px',
                border: '1px solid var(--kp-border)',
                backgroundColor: 'var(--kp-canvas)',
                color: 'var(--kp-ink)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--kp-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            backgroundColor: 'var(--kp-surface)',
          }}
        >
          <button
            type="button"
            onClick={handleQuickLaunch}
            style={{
              padding: '0 12px',
              height: '42px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--kp-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Skip &amp; Use Defaults
          </button>
          <button
            type="button"
            onClick={handleLaunch}
            className="kp-tactile"
            style={{
              padding: '0 20px',
              height: '44px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: 'var(--kp-primary)',
              color: 'var(--kp-on-primary)',
              fontSize: '13px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              cursor: 'pointer',
            }}
          >
            <span>Launch Planner</span>
            <IconArrowRight size={16} stroke={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
