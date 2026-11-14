// src/components/landing/IllustrationPlaceholder.jsx
"use client";

import { useState } from 'react';
import { Box, Group, Text, Badge, Button, Collapse, ActionIcon, Tooltip } from '@mantine/core';
import {
  IconPalette,
  IconCopy,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconSparkles,
  IconPhoto,
} from '@tabler/icons-react';

export function IllustrationPlaceholder({
  id = 'illustration',
  title = 'Scene Illustration',
  aspectRatio = '16/10',
  maxHeight = '420px',
  prompt = '',
  description = '',
  characterDetails = '',
  paletteDetails = 'Warm honey yellow (#F4B942), vanilla cream (#FFFDF7), soft cobalt blue (#3A7BD5), plant sage green (#2ECC71), deep ink outline (#111317)',
  styleKeywords = 'Whimsical editorial line-art illustration, loose black ink outlines, flat gouache color blocking, clean minimalist background, warm cozy study atmosphere, no text, no watermark',
  renderVisual,
}) {
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState(false);

  const fullPromptText = `${prompt}. Style: ${styleKeywords}. Color Palette: ${paletteDetails}. Composition: ${characterDetails}. High resolution, vector illustration aesthetic, no text, no gibberish typography, no watermark.`;

  const handleCopy = async (e) => {
    e?.stopPropagation?.();
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(fullPromptText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (_) {}
  };

  return (
    <Box
      id={`placeholder-${id}`}
      data-testid={`placeholder-${id}`}
      style={{
        width: '100%',
        borderRadius: '20px',
        border: '1.5px dashed rgba(217, 119, 6, 0.45)',
        backgroundColor: 'var(--kp-surface, #FFFDF7)',
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(217, 119, 6, 0.06)',
        position: 'relative',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
      }}
    >
      {/* Top Meta Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: 'rgba(245, 184, 66, 0.12)',
          borderBottom: '1px solid rgba(217, 119, 6, 0.18)',
          fontSize: '12px',
        }}
      >
        <Group gap="xs">
          <IconPhoto size={15} color="#D97706" />
          <Text size="xs" fw={700} c="var(--kp-ink)" style={{ letterSpacing: '0.01em' }}>
            {title}
          </Text>
          <Badge size="xs" variant="light" color="yellow" radius="sm">
            Placeholder
          </Badge>
        </Group>

        <Group gap="xs">
          <Button
            size="compact-xs"
            variant="filled"
            radius="md"
            onClick={handleCopy}
            leftSection={copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
            style={{
              backgroundColor: copied ? '#10B981' : '#D97706',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '11px',
            }}
          >
            {copied ? 'Copied Prompt!' : 'Copy AI Prompt'}
          </Button>

          <ActionIcon
            size="sm"
            variant="subtle"
            color="dark"
            onClick={() => setOpened((o) => !o)}
            aria-label="Toggle prompt details"
          >
            {opened ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </ActionIcon>
        </Group>
      </div>

      {/* Visual Canvas Area */}
      <div
        style={{
          width: '100%',
          aspectRatio,
          maxHeight,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          background:
            'radial-gradient(circle at 50% 30%, rgba(245, 184, 66, 0.18) 0%, rgba(255, 253, 247, 0.6) 70%)',
          overflow: 'hidden',
        }}
      >
        {renderVisual ? (
          renderVisual()
        ) : (
          <div style={{ textAlign: 'center', maxWidth: '380px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(217, 119, 6, 0.14)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '10px',
              }}
            >
              <IconPalette size={28} color="#D97706" />
            </div>
            <Text size="sm" fw={700} c="var(--kp-ink)" mb={4}>
              {description || 'Custom Editorial Illustration'}
            </Text>
            <Text size="xs" c="var(--kp-secondary)" lh={1.4}>
              Click <strong>&ldquo;Copy AI Prompt&rdquo;</strong> above to generate this exact image in Midjourney, DALL-E 3, or Flux.
            </Text>
          </div>
        )}
      </div>

      {/* Collapsible Prompt Inspector */}
      <Collapse in={opened}>
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: 'var(--kp-raised, #EDE7D7)',
            borderTop: '1px solid rgba(217, 119, 6, 0.2)',
            fontSize: '12px',
          }}
        >
          <Group gap="xs" mb={6}>
            <IconSparkles size={14} color="#D97706" />
            <Text size="xs" fw={700} c="var(--kp-ink)">
              Detailed Image Generation Specification
            </Text>
          </Group>

          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'var(--kp-surface, #FFFDF7)',
              borderRadius: '8px',
              border: '1px solid var(--kp-border)',
              fontFamily: 'var(--font-kp-mono, monospace)',
              fontSize: '11px',
              lineHeight: 1.5,
              color: 'var(--kp-ink)',
              wordBreak: 'break-word',
              userSelect: 'all',
            }}
          >
            {fullPromptText}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '8px',
            }}
          >
            <Text size="xs" c="var(--kp-secondary)">
              Palette: <em>{paletteDetails}</em>
            </Text>
            <Button
              size="compact-xs"
              variant="light"
              color="yellow"
              onClick={handleCopy}
              leftSection={copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
            >
              {copied ? 'Copied!' : 'Copy String'}
            </Button>
          </div>
        </div>
      </Collapse>
    </Box>
  );
}
