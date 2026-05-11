# Design Brief: FMS Pro

## Direction & Tone
Premium SaaS CRM for student fee management. Refined, sophisticated, trust-forward. Glassmorphism surfaces, gradient accents, layered depth. Stripe/Zoho/HubSpot aesthetic — clean data-driven interface with premium finish.

## Differentiation
- Gradient-enhanced data visualizations (indigo→emerald, indigo→rose)
- Role-layered sidebar navigation with emerald accent stripe
- Glass-effect modals with smooth backdrop blur
- Card elevation hierarchy through soft shadow layering
- Color-coded status badges (emerald success, amber warning, rose overdue)

## Color Palette (Light & Dark)

| Token | Light L C H | Dark L C H | Usage |
|-------|-----------|---------|-------|
| Primary | 0.55 0.22 264 | 0.75 0.18 264 | Indigo: BTN, nav accent, brand |
| Success | 0.60 0.20 145 | 0.65 0.20 145 | Emerald: paid, verified, positive |
| Warning | 0.65 0.18 60 | 0.72 0.16 60 | Amber: pending, caution |
| Destructive | 0.55 0.22 15 | 0.68 0.20 15 | Rose: overdue, error, delete |
| Sidebar Primary | 0.55 0.22 264 | 0.75 0.18 264 | Role nav accent |
| Sidebar Accent | 0.60 0.20 145 | 0.65 0.20 145 | Emerald accent stripe |

## Typography
- **Display** (headers, titles): Space Grotesk — geometric, modern, authoritative
- **Body** (content, forms): Inter — refined, accessible, 16px base
- **Mono** (code, amounts): JetBrains Mono — technical, transaction-appropriate

## Elevation & Depth
- `shadow-subtle` (1px): form inputs, small UI elements
- `shadow-card` (4px/12px): dashboard widgets, lead cards, transaction rows
- `shadow-elevated` (12px/24px): modals, floating panels, overlay surfaces
- `.glass`: card overlay (0.8 opacity, 12px blur), 0.3 border opacity
- `.glass-dark`: modal/popover (0.7 opacity, 12px blur), 0.2 border opacity

## Structural Zones
- **Header**: card elevation, full width, 1px bottom border
- **Sidebar**: dark (L 0.16 light / L 0.12 dark), emerald accent stripe, role icons, smooth nav transitions
- **Content**: background (L 0.97 light / L 0.145 dark), card-grid layout with 1rem radius
- **Cards**: card color (L 0.99 light / L 0.18 dark) + shadow-card, rounded-2xl
- **Modals**: glass effect, centered, shadow-elevated

## Spacing & Rhythm
- `--radius: 1rem` for all primary surfaces (cards, inputs, buttons)
- `md` breakpoint: 768px; `lg`: 1024px; `2xl`: 1400px
- Grid gap: 1rem (standard), 2rem (sections)
- Card padding: 1.5rem (compact), 2rem (spacious dashboards)

## Component Patterns
- **DataTable**: shadow-card, striped rows, role-based column visibility
- **Modals**: glass-dark backdrop, shadow-elevated, form validation badges
- **Buttons**: gradient-primary on CTA, primary + secondary for standard actions, ring on focus
- **Badges**: success (green), warning (amber), destructive (rose), semantic color mapping
- **Charts**: Recharts with gradient fills (chart-1/chart-2/chart-3)
- **Tabs**: underline nav, role-filtered content

## Motion
- Default transition: `transition-smooth` (all 0.3s cubic-bezier(0.4, 0, 0.2, 1))
- `animate-fade-in` (0.3s): entry animations on page load, modal show
- `animate-slide-in-from-top` (0.3s): navbar dropdowns, notifications
- `animate-slide-in-from-left` (0.3s): sidebar role expansion, panel reveals
- Hover: primary buttons scale 1.02, shadow shifts downward

## Constraints
- No rainbow color palettes; 3–5 colors only (indigo, emerald, amber, rose, neutral)
- No generic blue CTAs; indigo primary with gradient accent
- Glass effect used sparingly (modals, overlays only—not every card)
- All interactive elements inherit `transition-smooth` by default
- Dark mode: lighter primary (0.75 L), maintained emerald accent in sidebar

## Signature Detail
- Emerald accent stripe in sidebar (right edge, 3px) that extends into active nav item backgrounds
- Gradient-fill charts with smooth color transitions (indigo→emerald revenue, indigo→rose pending)
- Role-icon integration: crown (admin), briefcase (team head), headset (counselor), calculator (accountant)
- Soft glass overlays on all modals, never opaque white/black
