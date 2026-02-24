# Supabase Design System

Use this skill when styling UI components in this project.

## Overview

This codebase uses a unified token system where **shadcn/ui tokens are the canonical API**, built on Supabase-inspired scale variables.

## Token Mappings

| shadcn Token | References |
|--------------|------------|
| `--card` | `--surface-100` |
| `--popover` | `--surface-200` |
| `--muted` | `--surface-300` |
| `--muted-foreground` | `--foreground-muted` |
| `--primary` | `--brand-button` |
| `--ring` | `--brand-button` |

## Text Colors

| Class | Usage |
|-------|-------|
| `text-foreground` | Default text |
| `text-light` | Light/secondary text |
| `text-lighter` | Tertiary text |
| `text-muted` | Muted/subtle text |
| `text-contrast` | High contrast |
| `text-brand` | Brand-colored text |
| `text-brand-link` | Brand links |
| `text-warning` | Warning text |
| `text-destructive` | Error/danger text |

```tsx
<p className="text-foreground">Main content</p>
<p className="text-light">Secondary information</p>
<span className="text-muted">Last updated 2 hours ago</span>
<a className="text-brand-link hover:underline">Learn more</a>
```

## Background Colors

### Surface Hierarchy

| Class | Usage |
|-------|-------|
| `bg-background` | Main body |
| `bg-surface-75` | Subtle surface |
| `bg-surface-100` | Panels (same level as body) |
| `bg-surface-200` | Overlapping surfaces |
| `bg-surface-300` | Stacked above 200 |
| `bg-surface-400` | Highest elevation |

### Special Backgrounds

| Class | Usage |
|-------|-------|
| `bg-overlay` | Dropdowns, popovers |
| `bg-overlay-hover` | Overlay hover state |
| `bg-control` | Inputs, checkboxes |
| `bg-selection` | Selected items |
| `bg-dialog` | Modal backgrounds |
| `bg-button` | Button backgrounds |

```tsx
<div className="bg-surface-100 rounded-lg p-4">Card</div>
<div className="bg-overlay border border-overlay rounded-md shadow-lg">Menu</div>
<input className="bg-control border border-control rounded" />
```

## Border Colors

| Class | Usage |
|-------|-------|
| `border-border` | Default border |
| `border-muted` | Subtle border |
| `border-secondary` | Secondary border |
| `border-overlay` | Overlay borders |
| `border-control` | Input borders |
| `border-strong` | Hover/focus |
| `border-stronger` | Highly emphasized |
| `border-button` | Button border |
| `border-button-hover` | Button hover |

```tsx
<div className="border border-border rounded-lg">...</div>
<input className="border border-control focus:border-strong rounded" />
<hr className="border-muted" />
```

## Brand Colors

| Class | Shade |
|-------|-------|
| `bg-brand-200` | Lightest |
| `bg-brand-300` | Light |
| `bg-brand-400` | Medium-light |
| `bg-brand` | Default |
| `bg-brand-600` | Dark |
| `bg-brand-button` | Button-specific |

```tsx
<span className="bg-brand-200 text-brand-600 px-2 py-1 rounded">New</span>
<button className="bg-brand-button text-white hover:bg-brand-600">Submit</button>
```

## Warning Colors

| Class | Shade |
|-------|-------|
| `bg-warning-200` | Lightest |
| `bg-warning-300` | Light |
| `bg-warning` | Default |
| `bg-warning-600` | Dark |

```tsx
<div className="bg-warning-200 border border-warning-400 text-warning-600 p-4 rounded">
  <strong>Warning:</strong> This action cannot be undone.
</div>
```

## Destructive Colors

| Class | Shade |
|-------|-------|
| `bg-destructive-200` | Lightest |
| `bg-destructive-300` | Light |
| `bg-destructive` | Default |
| `bg-destructive-600` | Dark |

```tsx
<div className="bg-destructive-200 border border-destructive-400 text-destructive p-4 rounded">
  <strong>Error:</strong> Something went wrong.
</div>

<button className="bg-destructive text-destructive-foreground hover:bg-destructive-600">
  Delete
</button>
```

## Opacity Support

```tsx
<div className="bg-surface-300/50">50% opacity</div>
<div className="border-strong/75">75% opacity</div>
<div className="text-brand/80">80% opacity</div>
```

## Dark Mode

All utilities automatically adapt:

```tsx
<div className="bg-surface-100">Adaptive surface</div>
```

## Quick Reference

### Text Hierarchy
```
text-foreground       → Primary text
text-light            → Secondary text  
text-lighter          → Tertiary text
text-muted            → Disabled/placeholder
```

### Surface Hierarchy
```
bg-background         → Page background
bg-surface-100        → Cards, panels
bg-surface-200        → Dropdowns, popovers
bg-surface-300        → Nested overlays
```

### Border Hierarchy
```
border-muted          → Subtle dividers
border-border         → Default borders
border-strong         → Focus/hover states
border-stronger       → Emphasized borders
```

## Best Practices

1. **Use semantic colors** - `text-light` over arbitrary colors
2. **Maintain hierarchy** - 100 → 200 → 300 consistently
3. **Accent sparingly** - Brand/warning/destructive for emphasis
4. **Test both modes** - Verify light and dark themes
5. **Use opacity** - For subtle variations
