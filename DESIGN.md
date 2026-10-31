---
name: seaPilot
description: Calm customer support and evidence-led case work.
colors:
  primary: "#176b59"
  primary-hover: "#105342"
  on-primary: "#ffffff"
  ink: "#20342f"
  muted: "#61716a"
  canvas: "#f5f7f5"
  surface: "#ffffff"
  rail: "#eef3ef"
  border: "#dce5df"
  focus: "#318773"
  secondary: "#e5f2eb"
  secondary-hover: "#d2e9dc"
  source-system-bg: "#e8f4ed"
  source-system-ink: "#22674f"
  source-customer-bg: "#eaf0f9"
  source-customer-ink: "#3b5e8d"
  source-unverified-bg: "#fff3df"
  source-unverified-ink: "#89541a"
  neutral-badge-bg: "#eef1ef"
  neutral-badge-ink: "#58665e"
  error: "#a52e35"
typography:
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.35
rounded:
  control: "8px"
  composer: "10px"
  panel: "12px"
  chat: "14px"
  badge: "5px"
spacing:
  small: "8px"
  medium: "16px"
  panel: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  order-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px"
---

# Design System: seaPilot

## Overview

**Creative North Star: "Operate — a calm working surface"**

The shared interface uses restrained teal, pale green neutrals and clear pane boundaries. Customer support feels reassuring and spacious; the CS workspace is compact and evidence-led. Both use familiar task controls and precise status copy.

This is a code-led record of the current local frontend. Source files are `packages/ui/src/styles.css`, `packages/ui/src/index.tsx` and the components in both apps. Page strategy remains in `.impeccable/surfaces/`; this document records shared visual behavior.

**Key Characteristics:**
- Restrained teal actions on pale neutral surfaces.
- Spacious customer conversation; compact agent workspace.
- Source labels, explicit approval controls and honest demo status.

## Colors

### Primary

Deep teal identifies primary actions and active navigation. A darker teal marks hover. Pale teal secondary buttons offer a quieter route into a draft. The focus color provides a visible keyboard outline.

### Neutral

White surfaces sit on a pale green canvas, with a slightly deeper rail. Dark green ink carries content; muted green supports metadata. Light borders divide working panes without heavy framing.

### Semantic accents

System facts use green badges, customer claims use blue, and unverified claims use amber. Neutral badges carry identifiers and fixture labels. Error copy uses the error token. Always pair these colors with visible text.

**The Source Label Rule.** Preserve the visible source word; color alone never establishes a fact's provenance.

## Typography

The current UI body and controls use Arial with Helvetica and sans-serif fallbacks. Semibold labels separate actions and section headings from regular prose. Timestamps use tabular numerals.

Implemented hierarchy: the customer introduction is 36px, reducing to 29px on mobile; the workspace heading is 20px, reducing to 18px. Conversation bubbles in both sites use 16px with 1.7 line-height; agent density comes from pane structure and metadata, not smaller message text. Mobile composer text is 16px. These describe the build, not a new display-type standard. Compact metadata and badges currently descend to 9–11px; do not extend that density to new essential content without a legibility review.

## Layout

The customer site has an 80px header and a centered main container capped at 1120px including 32px side padding. Its chat and 286px order aside use a 24px gap. Below 768px, chat comes first, the aside follows in normal flow, and side padding becomes 16px. The order panel is not collapsible in the current build; earlier conversations use native disclosure. Mobile message height uses `clamp(220px,32dvh,320px)`.

The agent workspace fills `100dvh`. A 76px rail precedes a 248px inbox, flexible thread with a 320px minimum, and 370px case pane. At 1600px, the inbox and case pane grow to 290px and 420px. Below 1280px the case pane moves into a right-side sheet and the inbox is 240px. Below 768px the rail disappears and either inbox or selected thread occupies the width. Each long pane scrolls independently; composers remain outside message scroll regions.

Spacing centers on 8px, 16px and 24px with contextual 10px, 12px, 14px, 20px and 22px steps. Standard buttons are at least 40px tall, increasing to 44px on mobile. Compact buttons also maintain 40px desktop and 44px mobile minimum heights. Mobile filter tabs are at least 44px tall, and icon buttons are 44px wide.

## Elevation & Depth

Pane borders and tonal surfaces provide most depth. Cards are flat. The right-side sheet alone uses a structural shadow (`-8px 0 32px rgb(0 0 0 / 12%)`) above a dim overlay (`rgb(18 38 30 / 35%)`). Composer focus adds a small tonal ring rather than elevating the whole form.

**The Flat Surface Rule.** Use borders and tonal differences for ordinary containers; reserve the structural shadow for overlays.

## Shapes

Controls use softly rounded corners, with a larger radius for the composer and prominent customer panels. Badges have compact corners; avatars are circular. Message bubbles have one square upper corner indicating the sender side. Evidence tiles crop their illustration region within a small bordered frame. Keep these shapes functional and consistent across both sites.

## Components

### Buttons

Primary, outline, ghost and secondary variants share semibold labels, an 8px icon gap and the control radius. Outline and ghost hover use the rail surface. Secondary hover deepens its pale green background. Buttons transition background and text color over 160ms with ease; disabled buttons reduce opacity to .48 and do not accept pointer interactions. Keyboard focus uses a 3px focus outline with 3px offset. Reduced-motion preferences remove transitions.

### Fields and composer

The composer groups a labelled textarea and actions inside a bordered rounded frame. Focus within changes the border and adds a two-pixel pale green ring. Search uses a compact border and its own two-pixel focus outline. Hidden labels retain accessible field names. Mobile textarea sizing prevents undersized entry text.

### Badges and navigation

Source badges spell out System, Customer and Unverified. Case metadata carries System provenance; the team label is marked Unverified. Status badges similarly include text. Selected inbox rows gain a pale green fill; active filter buttons use teal text and a two-pixel underline. The desktop identity rail uses icon controls with accessible names. Mobile uses an explicit back-to-inbox control and a case-details trigger.

### Panels, sheets and evidence

The customer order card has a light border and generous padding. The agent case pane uses divided sections, a tinted shipment-change block and a separate missing-fact area. Reply approval and escalation approval remain separate controls. Radix sheets provide a title, description, close control and focus return. Evidence tiles use inline parcel artwork and the label Sample attachment; their detail view explains that no actual photo was supplied.

### Conversation and state

Sender names, times and bubble alignment distinguish participants. Status notices announce accepted local operations; error notices are separate. When a draft becomes stale, an amber review status and explicit review action keep it from being approved against outdated context. Empty states provide a short task-oriented explanation. Both sites display Local demo and explain that state is independent. Keep demo controls visually subordinate to the working conversation.

## Do's and Don'ts

### Do:
- Do preserve the spacious customer layout and compact agent layout within the shared palette.
- Do show source words, readable status text and explicit approval actions.
- Do retain visible keyboard focus, labelled controls and reduced-motion behavior.
- Do describe placeholder evidence and local operations accurately.

### Don't:
- Don't add decorative dashboard metrics to these task surfaces.
- Don't use color alone to distinguish fact source or operation status.
- Don't turn ordinary case sections into raised cards.
- Don't present a seeded attachment as a verified customer photo.
