# seaPilot interface system
## Direction
Operate mode, a calm working surface. The Customer site is reassuring and spacious; the CS site is compact and evidence-led. Use the plan's restrained teal direction, familiar task controls and precise status copy. No decorative dashboard metrics.
## Tokens
- Primary: #176b59; primary hover: #105342; on-primary: #ffffff.
- Ink: #20342f; muted: #61716a; surface: #ffffff; canvas: #f5f7f5; rail: #eef3ef; border: #dce5df.
- Success: #176b59 on #edf7f1; warning: #8a551b on #fff7e9; error: #a52e35 on #fff0f0.
- Typography: system sans; 13px labels, 14px UI, 16px conversation copy, 22px workspace titles, 36px customer heading.
- Spacing: 4/8px rhythm, 24px panel padding. Controls 40px minimum, mobile touch targets 44px.
- Radii: 8px controls, 12px prominent surfaces. Borders for pane separation; one soft shadow only for overlays.
## Shared components
Button variants, icon button, source/status badges, avatar, brand, accessible Radix sheet, illustrative evidence tile. Local shadcn/ui button pattern uses Radix Slot, cva and cn.
## Responsive structure
CS: three panes above 1280px, details sheet below; one selected pane below 768px. Customer: chat and order aside on desktop, chat first with collapsible order details on narrow screens.
## States and truth
Always show Local demo. Replies are explicitly approved. Simulated success is only shown after local state accepts the operation. Seeded photo placeholders state that sample images are unavailable. No external data or API claim.
