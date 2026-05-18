---
version: alpha
name: KalPad
description: >
  Dark, glassy, editorial study OS with an Apple-influenced command-center shell,
  neon semantic accents, and a colder research-lab mode.
colors:
  primary: "#BF5AF2"
  primary-strong: "#5E5CE6"
  secondary: "#34C759"
  tertiary: "#22D3EE"
  research: "#5538F8"
  warning: "#FF9500"
  danger: "#FF3B30"
  info: "#2997FF"
  background: "#000000"
  background-alt: "#050505"
  background-lab: "#020617"
  surface: "#1C1C1E"
  surface-raised: "#2C2C2E"
  surface-stroke: "#3A3A3C"
  surface-overlay: "#111113"
  surface-code: "#161618"
  text-primary: "#F5F5F7"
  text-secondary: "#E5E5E5"
  text-muted: "#D4D4D8"
  text-tertiary: "#A1A1AA"
  text-quaternary: "#86868B"
  text-inverse: "#000000"
  white: "#FFFFFF"
  bronze: "#CD7F32"
  silver: "#E0E0E0"
  gold: "#FFD700"
typography:
  display-hero:
    fontFamily: Lexend
    fontSize: 136px
    fontWeight: 900
    lineHeight: 0.85
    letterSpacing: -0.04em
  display-editorial:
    fontFamily: Georgia
    fontSize: 72px
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: -0.04em
  headline-xl:
    fontFamily: Lexend
    fontSize: 72px
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Lexend
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.03em
  headline-md:
    fontFamily: Lexend
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.03em
  title-lg:
    fontFamily: Lexend
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  title-md:
    fontFamily: Lexend
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  metric-xl:
    fontFamily: Lexend
    fontSize: 48px
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.03em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.7
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: Lexend
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Lexend
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.1em
  telemetry-sm:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
  code-sm:
    fontFamily: Fira Code
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  tile: 14px
  xl: 16px
  xxl: 24px
  pill: 999px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 40px
  hero: 60px
  section: 80px
  page-mobile: 16px
  page-desktop: 32px
  sidebar: 24px
  card-padding: 24px
  card-gap: 16px
  content-max: 1600px
elevation:
  canvas-glow-blur: 80px
  glass-blur: 24px
  glass-blur-heavy: 40px
  glass-saturation: 180
  border-light-opacity: 0.08
  border-strong-opacity: 0.2
  layer-base: 0
  layer-card: 1
  layer-modal: 2
  layer-overlay: 3
shadows:
  glass-card: "0 8px 32px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)"
  glass-card-strong: "0 20px 60px -20px rgba(191, 90, 242, 0.1)"
  glass-rim: "0 4px 24px -1px rgba(0, 0, 0, 0.2)"
  purple-glow: "0 15px 30px -10px rgba(191, 90, 242, 0.5)"
  cyan-glow: "0 20px 60px -10px rgba(34, 211, 238, 0.4)"
  screen-frame: "0 -40px 100px -20px rgba(191, 90, 242, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.05)"
motion:
  hover-lift-distance: 2px
  hover-lift-duration: "200ms"
  tap-scale: 0.96
  tap-spring-stiffness: 400
  tap-spring-damping: 10
  card-enter-distance: 10px
  card-enter-duration: "400ms"
  page-enter-duration: "400ms"
  ambient-cycle-fast: "4000ms"
  ambient-cycle-medium: "10000ms"
  ambient-cycle-slow: "15000ms"
  ease-standard: "[0.22, 1, 0.36, 1]"
components:
  app-shell:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text-primary}"
    padding: "{spacing.page-desktop}"
  floating-navbar:
    backgroundColor: "rgba(20, 20, 25, 0.75)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    padding: "{spacing.xs}"
    borderColor: "rgba(255, 255, 255, 0.1)"
    boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.5)"
    backdropFilter: "blur(20px) saturate(180%)"
  glass-card:
    backgroundColor: "rgba(30, 30, 32, 0.60)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xxl}"
    padding: "{spacing.card-padding}"
    borderColor: "rgba(255, 255, 255, 0.08)"
    boxShadow: "{shadows.glass-card}"
    backdropFilter: "blur(24px) saturate(180%)"
  glass-card-elevated:
    backgroundColor: "rgba(20, 20, 25, 0.9)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xxl}"
    padding: "{spacing.card-padding}"
    borderColor: "{colors.primary}"
    boxShadow: "{shadows.glass-card-strong}"
    backdropFilter: "blur(40px) saturate(180%)"
  button-primary:
    background: "linear-gradient(135deg, #BF5AF2 0%, #5E5CE6 100%)"
    textColor: "{colors.white}"
    typography: "{typography.label-md}"
    rounded: "{rounded.pill}"
    height: 54px
    padding: "0 32px"
    boxShadow: "{shadows.purple-glow}"
  button-primary-hover:
    background: "linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)"
  button-secondary:
    backgroundColor: "rgba(255, 255, 255, 0.05)"
    textColor: "{colors.white}"
    typography: "{typography.label-md}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    borderColor: "rgba(255, 255, 255, 0.2)"
    backdropFilter: "blur(10px)"
  button-guest:
    background: "linear-gradient(135deg, #0891B2 0%, #22D3EE 100%)"
    textColor: "{colors.white}"
    typography: "{typography.label-md}"
    rounded: "{rounded.pill}"
    height: 60px
    padding: "0 48px"
    boxShadow: "{shadows.cyan-glow}"
  metric-tile:
    backgroundColor: "rgba(255, 255, 255, 0.03)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
    borderColor: "rgba(255, 255, 255, 0.05)"
  calendar-day:
    backgroundColor: "rgba(255, 255, 255, 0.03)"
    textColor: "{colors.text-quaternary}"
    rounded: "{rounded.tile}"
    padding: "{spacing.sm}"
    borderColor: "rgba(255, 255, 255, 0.05)"
  calendar-day-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.tile}"
  badge-system:
    backgroundColor: "rgba(255, 255, 255, 0.05)"
    textColor: "{colors.text-quaternary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
    borderColor: "rgba(255, 255, 255, 0.15)"
  markdown-blockquote:
    backgroundColor: "rgba(191, 90, 242, 0.05)"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.lg}"
    borderColor: "{colors.primary}"
    padding: "{spacing.lg}"
  markdown-code-block:
    backgroundColor: "{colors.surface-code}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.code-sm}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
    borderColor: "rgba(255, 255, 255, 0.08)"
  research-shell:
    backgroundColor: "{colors.background-lab}"
    textColor: "{colors.text-primary}"
    borderColor: "rgba(255, 255, 255, 0.08)"
  research-card:
    backgroundColor: "rgba(15, 15, 20, 0.85)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xxl}"
    padding: "{spacing.lg}"
    borderLeftColor: "{colors.research}"
    borderColor: "rgba(255, 255, 255, 0.08)"
---

## Overview
KalPad should feel like a private academic command center, not a generic productivity app and not a cheerful classroom brand. The emotional register is intense, cinematic, tactical, and premium: exhausted students arrive with chaos, and the interface responds with calm structure, visible hierarchy, and ruthless clarity.

There are three closely related visual modes. The signed-in product is the default mode: near-black canvases, frosted glass cards, white typography, and selective purple-led emphasis. The public landing pages are more editorial and manifesto-like: giant headlines, serif italic interruption words, starfield and aurora backdrops, and bold reveal moments. Research mode belongs to the same family but shifts colder and more technical, replacing most purple dominance with electric indigo, grid overlays, and lab-console cues.

Across all modes, the product should feel expensive because the canvas is restrained. Color is never sprayed everywhere. It appears as glows, semantic highlights, gradient CTAs, progress marks, heatmap cells, and a few theatrical moments inside otherwise disciplined dark surfaces.

## Colors
The palette is anchored in black and charcoal, then energized by a small neon spectrum.

- **Primary (`#BF5AF2`)** is the default KalPad accent. Use it for the single most important action on a screen, active navigation states, emphasis words, progress accents, and violet glows.
- **Primary Strong (`#5E5CE6`)** is the indigo partner inside purple gradients and premium button finishes.
- **Secondary (`#34C759`)** signals momentum, correctness, completion, live status, and optimism. It is used more as confirmation than as brand paint.
- **Tertiary (`#22D3EE`)** is reserved for "test us", guest-mode, and experimental CTA moments. It should feel refreshing and disruptive because it appears rarely.
- **Research (`#5538F8`)** is the accent for workbench and laboratory experiences. When a screen is explicitly in research mode, this indigo displaces the normal purple-first emphasis.
- **Warning (`#FF9500`)** and **Danger (`#FF3B30`)** should stay sharp and high-contrast. Use them for urgency, triage, countdown pressure, difficult tasks, and failure states.
- **Metal tones** like bronze, silver, and gold are for subscription-tier signaling only. They should not become general-purpose accents.

Neutral surfaces should step from pure black into dense charcoal instead of light gray. Text should step from soft white into cool gray, not warm beige. Even when a section feels atmospheric, keep the actual readable layers crisp enough for a command-center interface.

## Typography
Lexend is the dominant voice of the product. It handles headlines, metrics, badges, CTA labels, navigation labels, and other high-importance UI. Set it heavy, tight, and confident. The common pattern is negative tracking with compact line heights so the UI feels decisive rather than airy.

Inter carries the operational load. Use it for paragraphs, helper text, descriptions, form copy, notes, and long-reading surfaces. Inter should preserve calm readability inside a visually intense environment, especially in note views and educational explanations.

A serif italic accent is used sparingly for emotionally charged words and manifesto phrases. It should feel like an interruption in tone, not a second full typography system. Reserve it for one or two phrases in a hero or section header, typically in purple or green, and keep the rest of the composition anchored by Lexend.

Monospace appears only when the UI needs to feel technical or observational: research telemetry, handles, timestamps, shell-like labels, small system diagnostics, and similar secondary metadata.

## Layout
Layout should feel roomy, modular, and containment-driven. The UI relies on large sections, clearly separated cards, and comfortable gutters so that dense information still feels controlled.

- Use an 8px spacing rhythm with 4px micro-adjustments.
- Default card padding is 24px, with 16px internal gaps and 40px to 80px between major content groups.
- The signed-in app prefers a wide canvas rather than a narrow centered column. On desktop, content can expand into a broad workspace with floating side chrome and large dashboard tiles.
- Mobile layouts should keep the same hierarchy but simplify the frame: more vertical stacking, safe-area-aware bottom navigation, slightly reduced ornament, and fewer simultaneous surfaces.
- Marketing pages should feel section-based and theatrical. Hero areas can occupy the full viewport and hand off into long, editorial blocks with big typography, screenshot reveals, and alternating atmospheric zones.

Bento composition is a core pattern. One dominant card should usually establish the mission, while smaller surrounding cards handle metrics, filters, calendar segments, breakdowns, or supporting proof.

## Elevation & Depth
Depth is created through atmosphere, glass, and tonal separation rather than dense skeuomorphic shadowing.

- The base layer is a black or blue-black void with subtle starfields, aurora washes, radial glows, soft blob lights, or a technical grid. Avoid flat one-color emptiness when a screen is intended to feel alive.
- Standard surfaces use dark translucent fills, 24px backdrop blur, 1px light borders at very low opacity, and soft black separation shadows.
- Elevated surfaces like modals, celebration states, or premium hero cards can increase blur to 40px, raise opacity, and add a focused color rim or glow.
- Interior light matters. Many glass panels should have a faint inner highlight or top-edge sheen so they read as layered material rather than matte boxes.
- Lite mode should remove costly blur and animation, but it should preserve the hierarchy through contrast, borders, spacing, and silhouette. The design must still read as KalPad without the atmospheric effects.

Purple, cyan, green, and indigo glows should act like controlled light leaks. They are strongest at edges, corners, or behind focal content, never as full-surface floods.

## Shapes
The shape language is soft-industrial. Nothing should feel razor-sharp, but the UI also should not become bubbly or toy-like.

- Use 24px corners for major glass cards, modal shells, and hero frames.
- Use 16px corners for inner panels and metric tiles.
- Use 12px corners for compact interactive pieces like chips, secondary cards, and tagged items.
- Use full-pill radii for nav capsules, floating toolbars, tier badges, and major CTA buttons.
- Circular forms are important for progress rings, avatars, status pips, spotlight glows, and heatmap dots.

Avoid mixing a lot of different radius personalities in the same view. Most screens should read as one system: pill CTAs, rounded glass containers, and otherwise consistent softened rectangles.

## Components
Navigation should feel suspended rather than docked into heavy bars. Desktop navigation can float as a left glass column or a centered pill navbar; mobile navigation should behave like a bottom dock with strong active-state fill and minimal clutter.

Primary buttons should feel luminous and premium, usually as purple-to-indigo gradients with subtle lift and glow. Secondary buttons should stay quiet and glassy. The cyan guest CTA is a special case and should feel more electric and promotional than the default app action.

Glass cards are the core containment unit. They usually combine a translucent dark fill, low-opacity white border, 24px blur, and a soft shadow. Many of them benefit from an internal localized color wash, especially in purple for mission cards, green for confidence or completion, orange for urgency, and indigo for research.

Status badges and micro-labels should be uppercase or near-uppercase, tightly spaced, and lightweight in footprint. They behave like system annotations, not decorative stickers.

Dashboard widgets should look like operational hardware: mission hero card, stats deck, day strip, task cards, rings, heatmaps, and streak cells. Even when playful color appears, the surrounding structure should stay disciplined and dark.

Markdown and study-note surfaces should stay readable first. Use Inter for body copy, Lexend for headings, purple for links and blockquote accents, and darker inset code blocks for technical material. Notes should feel premium and calm, not like a default browser stylesheet.

Research mode should look colder and more technical than the core product. Favor indigo accents, grid or lab overlays, monospace annotations, stronger side rails, and slightly more opaque dark surfaces. It should feel like the workbench of the same operating system, not a different brand.

## Do's and Don'ts
- Do keep the canvas dark and let emphasis come from glows, gradients, borders, and semantic accents.
- Do use Lexend for high-signal UI and Inter for reading-heavy content.
- Do use serif italic accent words sparingly to create editorial interruption, especially on landing pages.
- Do keep one obvious primary action per screen and make it noticeably brighter than everything around it.
- Do preserve strong contrast on top of atmospheric backgrounds.
- Don't flatten the main app into plain light cards on white backgrounds.
- Don't blanket an entire screen in purple; use it as a controlled signal.
- Don't mix too many accent families in one local area. Pick one hero accent and, if needed, one semantic support color.
- Don't use weak gray text on noisy or glowy areas without a dark backing surface.
- Don't make research mode warm or playful; it should stay sharp, technical, and blue-black.
