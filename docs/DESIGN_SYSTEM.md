# PIP PIP Dashboard — Design System

Arabic-first, RTL-first, light mode only. Operational dashboard, not a marketing site.

## Brand colors

| Token | Value | Use |
|---|---|---|
| `--brand-orange` / `--color-brand-primary` | `#FE5104` | Primary actions, focus, selected emphasis |
| `--brand-purple` / `--color-brand-secondary` | `#33215F` | Headings, brand contrast |
| `--brand-yellow` / `--color-brand-accent` | `#FCCB30` | Sparse accent only |

Do not use orange on every control. Secondary/ghost actions stay neutral.

## Semantic colors

Surfaces: `--color-surface-page`, `--color-surface-card`, `--color-surface-raised`, `--color-surface-subtle`, `--color-surface-hover`

Text: `--color-text-strong`, `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-text-disabled`, `--color-text-on-brand`

Borders: `--color-border-default`, `--color-border-subtle`, `--color-border-strong`, `--color-border-focus`

Status: `--color-success`, `--color-warning`, `--color-danger`, `--color-info` (+ `-soft` / `-text` variants)

Overlay: `--color-overlay`

Legacy names (`--primary-color`, `--bg-page`, `--bg-card`, `--border-color`) alias these tokens so sidebar/layout can stay unchanged until Phase 8.

## Typography

Primary font: **Readex Pro** (`--font-family-base`)

Scale: `--font-size-xs` 12px · `sm` 13px · `md` 15px · `lg` 16px · `xl` 18px · `2xl` 22px

Weights: 400 / 500 / 600 / 700

No negative letter-spacing on Arabic UI.

## Spacing (4px grid)

`--space-1` … `--space-6`, `--space-8`, `--space-10`, `--space-12` (4–48px)

## Radius

`--radius-sm` 8px · `--radius-md` 10px · `--radius-lg` 14px · `--radius-xl` 18px · `--radius-pill`

## Elevation

`--shadow-xs` through `--shadow-lg` (dialogs may use `--shadow-xl`)

Cards: border + `--shadow-sm`, not floating slabs.

## Control heights

`--control-height-sm` 36px · `--control-height-md` 42px · `--control-height-lg` 48px

Standard desktop inputs/buttons use `md`.

## Focus

`:focus-visible` uses `--focus-ring` (`0 0 0 3px` orange ring). Do not remove focus indicators.

## Motion

`--duration-fast` 120ms · `--duration-normal` 180ms · `--duration-slow` 240ms  
`--ease-default` / `--ease-out`

`prefers-reduced-motion: reduce` is handled in `src/styles/base.css`.

## Actions

| Role | Class | When |
|---|---|---|
| Primary | `.add-btn` | Create / save / one key action |
| Secondary | `.ghost-btn`, export button | Export, cancel, filters |
| Danger | `.danger-btn` | Delete / destructive confirm |
| Icon | `.circle-btn` | Table row actions |

## Inputs / selects

Shared language: 1.5px border, `--radius-md`, `--control-height-md`, `--focus-ring`. City picker, FormDialog, date/select filters should look like one family.

## Status badges

Soft fill + strong text. `ACTIVE` → success. `ARCHIVED`/`INACTIVE` → default/neutral. `SUSPENDED` → warning/danger. `DRAFT` → info/neutral.

## RTL

Prefer `margin-inline`, `padding-inline`, `inset-inline-*`, `border-inline-start`. Sidebar/layout structure is frozen until Phase 8.

## Files

- Tokens: `src/styles/tokens.css`
- Base: `src/styles/base.css`
- Shared helpers: `src/styles.css`
