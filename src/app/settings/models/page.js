// src/app/settings/models/page.js
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Badge,
  Box,
  Button,
  Group,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBolt,
  IconBrain,
  IconBrandOpenai,
  IconCheck,
  IconChevronLeft,
  IconMessageChatbot,
  IconRefresh,
} from '@tabler/icons-react';
import KalPadShell from '@/components/kalpad/KalPadShell';
import { useChatGPTBYOK } from '@/hooks/useChatGPTBYOK';
import {
  AUTO_MODEL_SLUG,
  DEFAULT_MODEL_PREFERENCES,
  GRANULAR_TASK_DEFINITIONS,
  MODEL_PRESETS,
  applyModelPreset,
  loadModelPreferences,
  resetAllModelsToAuto,
  setModelForTask,
} from '@/lib/byok/modelPreferences';
import classes from '@/components/settings/Settings.module.css';

const CATEGORY_SECTIONS = [
  {
    id: 'notes',
    heading: 'NOTES GENERATION PIPELINE',
    description:
      'Each subtopic note executes 3 staged AI operations. Route lightweight models to persona/outlines to preserve ChatGPT quota.',
  },
  {
    id: 'quiz',
    heading: 'QUIZ & ASSESSMENT ENGINE',
    description:
      'Granular routing for generating diagnostic MCQs and evaluating incorrect student attempts.',
  },
  {
    id: 'planner',
    heading: 'STUDY PLAN GENERATOR',
    description:
      'Deconstructs syllabi, analyzes quiz performance on regeneration, and writes daily actionable sub-topics.',
  },
  {
    id: 'doubt',
    heading: 'DOUBT SOLVER',
    description:
      'Inline note highlight explanations, real-world analogies, and step-by-step math tutor answers.',
  },
  {
    id: 'cram',
    heading: 'CRAM SHEET FORGER',
    description:
      'Compresses entire courses into unified master outlines and high-density pre-exam formula sheets.',
  },
  {
    id: 'chat',
    heading: 'ACADEMIC AI CHAT & ASSISTANT',
    description:
      'Streaming conversational chat inside Profile Temporary Chat.',
  },
  {
    id: 'research',
    heading: 'ACADEMIC RESEARCH LAB',
    description:
      'Synthesizes literature context and cited Q&A inside Research Workbench.',
  },
];

export default function ModelSelectorPage() {
  const {
    isAuthenticated,
    isAuthenticating,
    userEmail,
    availableModels,
    isLoadingModels,
    connectChatGPT,
    refreshModels,
  } = useChatGPTBYOK();

  const [prefs, setPrefs] = useState({ ...DEFAULT_MODEL_PREFERENCES });

  const syncPrefs = useCallback(() => {
    setPrefs(loadModelPreferences());
  }, []);

  useEffect(() => {
    syncPrefs();
    if (typeof window === 'undefined') return;
    const onModelsChanged = () => syncPrefs();
    window.addEventListener('kalpad-byok-models-changed', onModelsChanged);
    window.addEventListener('storage', onModelsChanged);
    return () => {
      window.removeEventListener('kalpad-byok-models-changed', onModelsChanged);
      window.removeEventListener('storage', onModelsChanged);
    };
  }, [syncPrefs]);

  const modelSelectOptions = useMemo(() => {
    const base = [
      {
        value: AUTO_MODEL_SLUG,
        label: 'Auto (Recommended — Optimal speed & quality)',
      },
    ];
    const discovered = Array.isArray(availableModels) ? availableModels : [];
    const seen = new Set([AUTO_MODEL_SLUG]);

    for (const m of discovered) {
      if (!m?.slug || seen.has(m.slug)) continue;
      seen.add(m.slug);
      base.push({
        value: m.slug,
        label: m.displayName && m.displayName !== m.slug
          ? `${m.displayName} (${m.slug})`
          : m.slug,
      });
    }

    // Ensure fallback defaults exist so user can always choose mini vs 4o cleanly
    if (!seen.has('gpt-4o')) {
      seen.add('gpt-4o');
      base.push({ value: 'gpt-4o', label: 'GPT-4o (gpt-4o)' });
    }
    if (!seen.has('gpt-4o-mini')) {
      seen.add('gpt-4o-mini');
      base.push({ value: 'gpt-4o-mini', label: 'GPT-4o mini (gpt-4o-mini)' });
    }

    // Ensure any custom saved slug outside current catalog remains selectable
    Object.values(prefs).forEach((slug) => {
      if (slug && !seen.has(slug)) {
        seen.add(slug);
        base.push({ value: slug, label: slug });
      }
    });

    return base;
  }, [availableModels, prefs]);

  const customCount = useMemo(
    () =>
      GRANULAR_TASK_DEFINITIONS.filter(
        (task) => prefs[task.key] && prefs[task.key] !== AUTO_MODEL_SLUG
      ).length,
    [prefs]
  );

  const handleSelectModel = (taskKey, nextSlug) => {
    const updated = setModelForTask(taskKey, nextSlug || AUTO_MODEL_SLUG);
    setPrefs(updated);
  };

  const handleApplyPreset = (preset) => {
    const updated = applyModelPreset(preset.id, availableModels);
    setPrefs(updated);
    notifications.show({
      title: `Preset applied: ${preset.label}`,
      message: preset.description,
      color: 'teal',
    });
  };

  const handleResetAll = () => {
    const updated = resetAllModelsToAuto();
    setPrefs(updated);
    notifications.show({
      title: 'Reset to Auto All',
      message: 'Every AI stage now routes automatically.',
      color: 'teal',
    });
  };

  return (
    <KalPadShell>
      <div className={classes.page} data-testid="model-selector-page">
        {/* Header matching Quiet Study Desk & Android AIModelSelectorScreen */}
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="md" mb="lg">
          <Group gap="sm" align="center">
            <Link
              href="/settings"
              aria-label="Back to Profile settings"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'var(--kp-surface)',
                border: '1px solid var(--kp-border)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--kp-ink)',
                textDecoration: 'none',
              }}
            >
              <IconChevronLeft size={18} />
            </Link>
            <div>
              <h1 className={classes.title} style={{ margin: 0 }}>
                Model routing
              </h1>
              <p className={classes.subtitle} style={{ margin: 0 }}>
                Choose the right ChatGPT model for every granular stage of KalPad&apos;s AI calls
              </p>
            </div>
          </Group>

          <Group gap="xs">
            <Button
              variant="default"
              size="xs"
              radius="md"
              leftSection={<IconRefresh size={14} />}
              loading={isLoadingModels}
              onClick={refreshModels}
              style={{
                backgroundColor: 'var(--kp-surface)',
                color: 'var(--kp-ink)',
                borderColor: 'var(--kp-border)',
              }}
            >
              Refresh Catalog
            </Button>
            <Button
              variant="subtle"
              size="xs"
              radius="md"
              onClick={handleResetAll}
              disabled={customCount === 0}
              style={{
                backgroundColor: 'var(--kp-butter)',
                color: 'var(--kp-accent-ink)',
                fontWeight: 700,
              }}
            >
              Auto All
            </Button>
          </Group>
        </Group>

        <Stack gap="lg">
          {/* Routing Overview & Connection Status Card */}
          <div
            style={{
              backgroundColor: 'var(--kp-mint)',
              border: '1px solid var(--kp-border)',
              borderRadius: '20px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <Group gap="md" wrap="nowrap" align="center" style={{ maxWidth: '640px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  backgroundColor: 'var(--kp-butter)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconBrain size={22} color="var(--kp-ink)" />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--kp-ink)' }}>
                  Match each study task to the right model
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--kp-secondary)', marginTop: '2px' }}>
                  All AI generation runs directly from your browser using your OpenAI ChatGPT quota.
                  {isAuthenticated
                    ? ` Connected as ${userEmail || 'ChatGPT Account'} (${availableModels.length} models).`
                    : ' Connect ChatGPT to load your live account model catalog.'}
                </div>
              </div>
            </Group>

            <Group gap="xs">
              {isAuthenticated ? (
                <>
                  <Badge color="teal" variant="light" leftSection={<IconCheck size={12} />}>
                    {customCount === 0 ? 'All Auto' : `${customCount} Custom`}
                  </Badge>
                  <Button
                    size="xs"
                    radius="md"
                    variant="default"
                    leftSection={<IconMessageChatbot size={14} />}
                    onClick={() => window.dispatchEvent(new CustomEvent('open-byok-chat'))}
                    style={{
                      backgroundColor: 'var(--kp-surface)',
                      color: 'var(--kp-ink)',
                      borderColor: 'var(--kp-border)',
                    }}
                  >
                    Test in Temporary Chat
                  </Button>
                </>
              ) : (
                <Button
                  size="xs"
                  radius="md"
                  loading={isAuthenticating}
                  leftSection={<IconBrandOpenai size={15} />}
                  onClick={connectChatGPT}
                  style={{
                    backgroundColor: '#D97706',
                    color: '#111317',
                    fontWeight: 700,
                  }}
                >
                  Connect ChatGPT
                </Button>
              )}
            </Group>
          </div>

          {/* Quick Routing Presets */}
          <div className={classes.card}>
            <Group gap="xs" mb="sm">
              <IconBolt size={16} color="#D97706" />
              <span
                style={{
                  fontFamily: 'var(--font-kp-mono)',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--kp-ink)',
                  letterSpacing: '0.03em',
                }}
              >
                QUICK ROUTING PRESETS
              </span>
            </Group>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '10px',
              }}
            >
              {MODEL_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  id={`byok-preset-${preset.id}`}
                  data-testid={`model-preset-${preset.id}`}
                  onClick={() => handleApplyPreset(preset)}
                  className={classes.interactiveRow}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--kp-raised)',
                    border: '1px solid var(--kp-border)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <Group justify="space-between" align="center" gap="xs">
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--kp-ink)' }}>
                      {preset.label}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-kp-mono)',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--kp-butter)',
                        color: 'var(--kp-accent-ink)',
                      }}
                    >
                      {preset.badge}
                    </span>
                  </Group>
                  <span style={{ fontSize: '11.5px', color: 'var(--kp-secondary)', lineHeight: 1.45 }}>
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Granular Pipeline Category Sections */}
          {CATEGORY_SECTIONS.map((section) => {
            const tasks = GRANULAR_TASK_DEFINITIONS.filter((t) => t.category === section.id);
            return (
              <Box key={section.id}>
                <div style={{ marginBottom: '10px' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-kp-mono)',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--kp-accent-ink)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {section.heading}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--kp-secondary)', marginTop: '2px' }}>
                    {section.description}
                  </div>
                </div>

                <Stack gap="sm">
                  {tasks.map((task) => {
                    const currentVal = prefs[task.key] || AUTO_MODEL_SLUG;
                    return (
                      <div key={task.key} className={classes.card} style={{ padding: '16px 18px' }}>
                        <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs" mb="xs">
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--kp-ink)' }}>
                              {task.title}
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: 'var(--kp-secondary)',
                                marginTop: '2px',
                                lineHeight: 1.45,
                              }}
                            >
                              {task.subtitle}
                            </div>
                          </div>

                          <span
                            style={{
                              fontFamily: 'var(--font-kp-mono)',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: '8px',
                              backgroundColor: 'var(--kp-butter)',
                              color: 'var(--kp-accent-ink)',
                              flexShrink: 0,
                            }}
                          >
                            {task.costTip}
                          </span>
                        </Group>

                        <Select
                          data-testid={`model-select-${task.key}`}
                          aria-label={task.title}
                          size="sm"
                          value={currentVal}
                          onChange={(val) => handleSelectModel(task.key, val)}
                          data={modelSelectOptions}
                          allowDeselect={false}
                          searchable={modelSelectOptions.length > 8}
                          styles={{
                            input: {
                              backgroundColor: 'var(--kp-canvas)',
                              color: 'var(--kp-ink)',
                              borderColor: 'var(--kp-border)',
                              fontFamily: 'var(--font-kp-mono)',
                              fontSize: '12.5px',
                            },
                            dropdown: {
                              backgroundColor: 'var(--kp-surface)',
                              borderColor: 'var(--kp-border)',
                            },
                            option: {
                              color: 'var(--kp-ink)',
                              fontFamily: 'var(--font-kp-mono)',
                              fontSize: '12px',
                            },
                          }}
                        />
                      </div>
                    );
                  })}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </div>
    </KalPadShell>
  );
}
