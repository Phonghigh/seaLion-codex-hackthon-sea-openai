---
name: seaPilot
description: Calm customer support and evidence-led case work.
colors:
  welcome: "#1f4dcc"
  welcome-copy: "#deebff"
  change-bg: "#dff3f4"
  change-ink: "#174c57"
  navy: "#102746"
  signal: "#79e6ec"
  primary: "#2254db"
  primary-hover: "#1943b6"
  on-primary: "#ffffff"
  ink: "#16243c"
  muted: "#5d6c80"
  canvas: "#eef3f8"
  surface: "#ffffff"
  rail: "#e8effa"
  border: "#d9e2ec"
  focus: "#2254db"
  secondary: "#e8effa"
  secondary-hover: "#dce6f7"
  source-system-bg: "#e7f3ec"
  source-system-ink: "#22674f"
  source-customer-bg: "#e8effb"
  source-customer-ink: "#365d94"
  source-unverified-bg: "#fff2da"
  source-unverified-ink: "#89541a"
  neutral-badge-bg: "#edf1f5"
  neutral-badge-ink: "#526171"
  error: "#a52e35"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Arial, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-1px"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.35
rounded:
  control: "8px"
  composer: "12px"
  panel: "14px"
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

**Creative North Star: "Continuity in blue"**

The shared interface uses expressive cobalt, midnight navigation, small cyan accents and chalk-white working surfaces to strengthen the Sea team identity. Customer support feels reassuring and spacious; the CS workspace is compact and evidence-led. Familiar controls, strong weight hierarchy and precise status copy keep the conversation central.

This records the approved “More expressive color and a stronger Sea identity” direction as implemented in `packages/ui/src/styles.css`, shared shadcn components and both apps. The existing seaLion mascot remains the brand asset. Surface strategy and the direction seed reference (`seed:9d89fc1ae9991f84`) live in `.impeccable/surfaces/`.

**Key Characteristics:**
- Cobalt welcome and actions, midnight agent navigation, small cyan brand accents.
- Existing seaLion mascot paired with the seaPilot wordmark.
- Spacious customer conversation; compact agent workspace.
- Visible fact sources, explicit approval controls and accurate API or fixture status.

## Colors

### Primary

Cobalt marks primary actions, keyboard focus and the customer's outgoing bubbles. A separate welcome cobalt fills the customer introduction, with white headings and pale blue supporting text. Primary hover darkens the action color. Secondary buttons use the pale `rail` surface.

### Brand framing

Midnight navy fills the CS navigation rail. The customer header is white above the cobalt welcome band. Signal cyan accents the wordmark dot on the dark rail. Preserve the existing mascot; do not invent a replacement logo or imply a partner endorsement.

### Neutral

White work areas sit against a cool canvas. The `rail` token is a light interaction surface, while the actual navigation rail uses `navy`. Ink carries content; muted blue-gray carries metadata. Light borders divide the panes. Selected queue rows are white with a blue border against the tinted inbox.

### Semantic accents

System facts use green badges, customer claims use blue, and unverified claims use amber. Neutral badges carry identifiers. Error copy uses the error token. Shipment changes receive a pale cyan block with dark teal copy. Pair every state color with visible text.

**The Source Label Rule.** Preserve the visible source word; color alone never establishes a fact's provenance.

## Typography

Body and controls use the platform system stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`. There is no external font dependency. Body copy is 14px/1.5; buttons are 13px/1.35 at weight 600. Timestamps use tabular numerals.

The customer introduction is 34px/1.15 at weight 700 with -1px tracking; it becomes 29px below 901px and 30px below 768px with -0.7px tracking. The workspace title is 22px. On mobile it remains available to screen readers while the visible header shows the mascot and a 20px seaPilot wordmark. Section headings range from 14–17px at weight 650. Conversation bubbles are 15px/1.7. Metadata and badges are mainly 11–12px; queue timestamps are 10px. Mobile composer text is 16px. Keep essential message content at the readable conversation scale.

## Layout

The customer header is at least 76px tall. The main container is capped at 1240px including 28px side padding, with a 28px top margin. A cobalt welcome band uses 32px by 36px padding. The conversation and 300px order aside share a 24px gap. At 900px and below the aside becomes 260px and the gap 18px. Below 768px the chat and order aside stack, page padding becomes 16px and the welcome content stacks. Customer messages use a 320px scroll area on desktop and `clamp(260px,40dvh,390px)` on mobile.

The CS workspace fills `100dvh`. Its labelled navy rail is 188px wide at 1400px and above; from 768–1399px it is a 72px icon rail. The columns are a 260px inbox, flexible thread with a 300px minimum, and 330px case context. At 1600px they become 290px, at least 400px, and 380px. Below 1280px the case context moves into a right-side sheet and the inbox becomes 250px. Below 768px the rail disappears and either inbox or selected thread fills the width. Long panes scroll independently, with the composer following the message region. The sheet is at most 460px wide and becomes full viewport width on mobile.

Spacing centers on 8px, 16px and 24px with contextual 10px, 12px, 14px, 20px, 22px, 26px and 28px steps. Standard and small buttons are at least 40px tall, increasing to 44px on mobile. Mobile tabs and icon controls also use 44px targets.

## Elevation & Depth

Pane borders and tonal surfaces provide depth. Ordinary cards and buttons suppress shadows. The right-side sheet uses `-8px 0 32px rgb(0 0 0 / 12%)` above a `rgb(16 39 70 / 35%)` overlay. Registry popovers retain their overlay treatment. Composer focus changes its border and adds a 2px pale blue outline with a 1px offset.

**The Flat Surface Rule.** Use borders and tonal differences for ordinary containers; reserve the structural shadow for overlays.

## Shapes

Controls use 8px corners, composers 12px, chat and order panels 14px, and the desktop welcome band 16px. Badges use 5px corners, evidence tiles 10px, and avatars are circular. Bubbles have a tighter 3px upper corner on the sender side and 14px elsewhere. Case sections remain flat, divided rectangles.

## Components

### Component foundation

Use the owned official shadcn New York components: Button, Badge, Card, Input, Textarea, Label, Select, Tabs, Accordion, Avatar, Sheet and Alert. Shared wrappers supply product sizing, colors and focus behavior. Native landmarks, headings and forms remain semantic HTML. Badge renders an inline span for source-labelled paragraphs. See `packages/ui/SHADCN-SOURCES.md` for registry provenance.

### Buttons and fields

Primary, outline, ghost and secondary variants share 9px by 14px padding, an 8px icon gap and weight 600. Outline and ghost hover use the pale rail surface. Background and text color transition over 160ms ease. Disabled controls use .48 opacity and no pointer interaction. Keyboard focus uses a 3px cobalt outline with a 3px offset. Reduced-motion preferences remove transitions.

The composer groups a labelled textarea and actions in a frame with 14px padding, a light border and 12px corners. Focus within adds the pale blue outline. Search has its own compact frame and 2px focus outline. Preserve accessible field names and 16px mobile entry text.

### Navigation and sources

The wide rail shows text labels beside icons; compact rail controls retain accessible names. Active navigation uses cobalt on navy. Queue selection uses a white surface and blue border. Filter Tabs use cobalt text and a 2px underline. Mobile keeps the mascot and wordmark in its header and exposes back-to-inbox, case details and suggestion controls. Source badges spell out System, Customer and Unverified; status color always accompanies readable words.

### Panels, evidence and approval

The customer order card has a light border and 24px padding. Case context uses divided sections, a cyan shipment-change block and a separate missing-fact area. Reply approval and escalation approval remain separate actions. The Sheet provides its title, description, close action and focus handling. Evidence tiles remain clearly identified as evidence or labelled sample attachments; brand artwork is never evidence.

### Conversation and state

Names, timestamps and alignment distinguish participants. Customer outgoing bubbles use cobalt with white text; agent-side outgoing bubbles use pale blue with dark text. Pending, failed and stale-draft states retain explicit text and appropriate approval gating. API mode is primary; fixture mode is a labelled fallback. Demo controls remain subordinate to the conversation. Never claim completion before an action succeeds.

### Brand assets

`packages/ui/src/brand.tsx` renders the existing seaLion mascot from the supplied team asset documented in `packages/ui/src/assets/sealion-icon.svg`. The mark sits in a compact rounded white or pale-blue container beside the seaPilot wordmark. Preserve its proportions and source provenance. The implemented headers do not use the older connected-path motif.

## Do's and Don'ts

### Do:
- Do compose application controls from the shared shadcn exports.
- Do preserve the spacious customer layout and compact agent layout within the shared palette.
- Do show source words, readable status text and explicit approval actions.
- Do retain visible keyboard focus, labelled controls and reduced-motion behavior.
- Do describe evidence and API or fixture operations accurately.

### Don't:
- Don't replace the existing mascot or use cyan text on white.
- Don't add decorative dashboard metrics to these task surfaces.
- Don't use color alone to distinguish fact source or operation status.
- Don't turn ordinary case sections into raised cards.
- Don't present a seeded attachment as a verified customer photo.
