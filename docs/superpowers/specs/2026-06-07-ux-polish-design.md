# UX Polish — Design Spec

> Fresque de l'IA EPNAK — 7 areas of UX improvement before Jour J (16 juillet 2026)

---

## Scope

7 areas selected for polish:

| Area | Code | Approach |
|------|------|----------|
| Loading states | A | Spinners (buttons/small) + Skeletons (content areas) |
| Error recovery | B | Auto-retry 3x with visible "Connexion perdue..." message, manual retry on final failure |
| Mobile/tablet | C | Tablet-first (768px+), light phone fixes, no mobile-first redesign |
| Toast notifications | D | Top-center banner, auto-dismiss 3s, one at a time |
| Phase transitions | E | 300ms opacity fade between phases |
| Accessibility | G | Essentials: aria-labels, semantic HTML, aria-live, focus-visible |
| Auto-save | H | localStorage every 5s, scoped per team, clear on submit |

**Not in scope:** Dark mode, Storybook, full WCAG AA, focus traps, skip navigation, internationalization, admin batch actions, Défi 4 content diff.

---

## 1. Shared Primitives

### 1.1 `components/shared/Spinner.tsx`

CSS-only rotating circle. Props:

```typescript
type SpinnerProps = {
  size?: "sm" | "md"  // sm=16px (buttons), md=24px (content areas)
}
```

Uses theme green (`#2D5A3D`). CSS `@keyframes spin` with `border-2 border-t-transparent`.

### 1.2 `components/shared/Skeleton.tsx`

Pulsing gray block. Props:

```typescript
type SkeletonProps = {
  className?: string  // width/height shaping, e.g. "h-4 w-3/4"
}
```

Uses `animate-pulse` with `bg-gray-100` (`#F5F5F5`). Renders a `<div>` that matches the shape of incoming content.

### 1.3 `components/shared/Toast.tsx` + `lib/hooks/useToast.ts`

Top-center notification system.

**Toast component:** Fixed container at `fixed top-4 left-1/2 -translate-x-1/2 z-[60]`. Slides down with 300ms fade. Auto-dismiss after 3s.

**Hook API:**

```typescript
type ToastType = "success" | "error" | "info"

function useToast(): {
  show: (message: string, type?: ToastType) => void
}
```

**Provider:** `<ToastProvider>` wraps children in `app/layout.tsx`. Uses React context.

**Styling by type:**
- `success`: green bg (`#2D5A3D`), white text
- `error`: red bg (`#8B3A3A`), white text
- `info`: gray bg (`#4A4A4A`), white text

**Accessibility:** `role="status"`, `aria-live="assertive"`.

One toast at a time. New toast replaces current one (resets 3s timer).

### 1.4 `components/shared/FadeTransition.tsx`

Opacity transition wrapper. Props:

```typescript
type FadeTransitionProps = {
  phaseKey: string      // changing this triggers the fade
  children: React.ReactNode
}
```

When `phaseKey` changes: fade out 150ms (opacity 1 -> 0), swap children, fade in 150ms (opacity 0 -> 1). Pure CSS `transition: opacity 150ms ease-in-out`.

### 1.5 `lib/hooks/useAutoSave.ts`

localStorage auto-save with team scoping.

```typescript
// Save: writes every 5s when value changes
function useAutoSave(key: string, value: unknown): void

// Restore: reads on mount
function useAutoSaveRestore(key: string): {
  restored: unknown | null
  clear: () => void
}
```

**Key format:** `fresque-ia:{teamId}:{key}` — prevents collisions across teams on shared devices.

**Lifecycle:**
- Save starts on first user input, runs every 5s if value changed (shallow JSON comparison)
- `clear()` called on successful Supabase submission
- No save when phase is "results" or "done"

### 1.6 `lib/hooks/useRetry.ts`

Auto-retry with exponential backoff.

```typescript
function useRetry<T>(
  asyncFn: () => Promise<T>,
  options?: {
    maxRetries?: number      // default 3
    backoff?: number[]       // default [1000, 2000, 4000]
  }
): {
  execute: () => Promise<T>
  isRetrying: boolean
  retryCount: number
  error: Error | null
  reset: () => void
}
```

Consuming component reads `isRetrying` + `retryCount` to display inline "Connexion perdue, nouvelle tentative..." message.

---

## 2. Loading States (A)

### Spinners (replace "..." text)

| Location | Current | New |
|----------|---------|-----|
| `SubmitButton` state="loading" | Text "..." | `<Spinner size="sm" />` inline next to label |
| Porte chat streaming indicator | Pulsing "..." | `<Spinner size="sm" />` + "Le Gardien reflechit..." |
| Join page auth | "Connexion en cours..." text only | `<Spinner size="md" />` + "Connexion en cours..." |
| Admin control unlock button | "..." text | `<Spinner size="sm" />` |
| Admin control pause button | No indicator | `<Spinner size="sm" />` during async |

### Skeletons (replace empty content areas)

| Location | Shape |
|----------|-------|
| `StreamedOutput` before generation | 3 lines: `h-4 w-full`, `h-4 w-full`, `h-4 w-3/4` |
| Challenge 1 document cards | Full card skeleton: `h-[400px] w-full` |
| Challenge 3 cached response | 4 lines matching response box height |
| Challenge 4 columns (x5) | Per-column: `h-[300px] w-full` |
| Dashboard team cards (x10) | Per-card skeleton: `h-[180px]` |

---

## 3. Error Recovery & Visible Retry (B)

### Stream calls (all challenges)

Current `streamFromProxy()` calls get wrapped in `useRetry`:

```
streamFromProxy() fails
  -> auto-retry 1 (1s delay): show "Connexion perdue, nouvelle tentative..."
  -> auto-retry 2 (2s delay): same message, update count
  -> auto-retry 3 (4s delay): same
  -> all fail: show "Echec de la generation." + "Reessayer" button
```

Inline message appears below `StreamedOutput`, styled as gray text with `aria-live="polite"`.

"Reessayer" button calls `execute()` again (resets retry count).

### Specific call sites

| Call site | Max retries | Failure message |
|-----------|-------------|-----------------|
| `streamFromProxy()` (challenges) | 3 | "Echec de la generation. Reessayer ?" |
| Join page auth + RPC | 2 | "Connexion impossible. Reessayer ?" + link to home |
| Porte chat SSE | 3 | "Reconnexion au Gardien..." (with conversation history preserved) |
| Supabase inserts (predictions, submissions) | 2 | Toast error: "Sauvegarde echouee -- verifiez votre connexion" |
| Dashboard/control realtime | Supabase built-in reconnect | Top banner: "Connexion temps reel perdue, reconnexion..." auto-dismiss on reconnect |

### Data preservation

On any failure, form data stays in place. Retry re-sends the same payload. Inputs are never cleared on error.

---

## 4. Mobile/Tablet Responsiveness (C)

Focus: 768px+ tablet. No mobile-first redesign.

### Layout fixes

| Component | Current | New |
|-----------|---------|-----|
| Challenge 4 (5 columns) | `min-w-[280px]` horizontal scroll | `< lg`: vertical accordion (tap to expand one column). `lg+`: keep horizontal layout |
| Dashboard grid | 5 columns hardcoded | `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` |
| Challenge 2 output | Side-by-side only | `flex-col md:flex-row` |
| Admin control team table | No overflow handling | `overflow-x-auto` wrapper |
| PredictionWidget multiselect | Buttons wrap awkwardly | `flex-wrap gap-2` with `min-w-[80px]` per button |

### Touch targets

All interactive elements: `min-h-[44px] min-w-[44px]` (Apple HIG). Applied to:
- All `<button>` elements
- Star voting buttons (Challenge 5)
- Multiselect buttons (PredictionWidget)
- TF list buttons (PredictionWidget)

### Scroll indicators

Challenge 1 documents (`max-h-[400px]`): add a subtle bottom fade gradient (`bg-gradient-to-t from-white to-transparent h-8`) when content overflows, signaling scrollable content.

---

## 5. Toast Notifications (D)

### Provider setup

`<ToastProvider>` wraps `{children}` in `app/layout.tsx`, above `<PauseOverlay>`.

### Toast triggers

| Action | Type | Message |
|--------|------|---------|
| Prediction locked | success | "Prediction verrouillee" |
| Challenge submission saved | success | "Reponse enregistree" |
| Pact vote submitted | success | "Vote enregistre" |
| Porte password validated | success | "Mot de passe accepte -- bienvenue !" |
| Admin: challenge activated | success | "Defi X active" |
| Admin: team unlocked | success | "Equipe XXXX debloquee" |
| Admin: pause toggled | info | "Pause activee" / "Reprise" |
| Bonus activated | success | "Bonus X active pour N equipes" |
| Save failure (after retries) | error | "Sauvegarde echouee -- verifiez votre connexion" |
| Stream failure (after retries) | error | "Generation impossible -- reessayez" |
| Auto-save restored | info | "Brouillon restaure" |

**Not toasted:** phase transitions, timer updates, keystrokes, streaming chunks, realtime dashboard updates.

---

## 6. Phase Transitions (E)

### FadeTransition usage

Every challenge page wraps its phase-dependent content in `<FadeTransition phaseKey={phase}>`.

| Page | Phases |
|------|--------|
| Challenge 1 | documents -> prediction -> generation -> results |
| Challenge 2 | contributions -> prediction -> generation -> evaluation |
| Challenge 3 | case-0 -> case-1 -> case-2 -> case-3 -> results |
| Challenge 4 | prediction -> generation -> approval |
| Challenge 5 | inspiration -> cadrage -> generation -> vote -> finalized |
| Porte | chat -> password-reveal -> redirect |

### What is NOT faded

- Streaming content within StreamedOutput (continuous flow, no transition)
- Timer updates
- Realtime dashboard card updates
- Toast appearances (own animation)
- PauseOverlay show/hide (instant, overlay is blocking)

---

## 7. Accessibility Essentials (G)

### Semantic HTML

- Dashboard + Admin control tables: `<thead>`, `<tbody>`, `<th scope="col">`
- One `<h1>` per page, sub-sections use `<h2>`/`<h3>` hierarchy
- Page regions: `<main>` for content, `<nav>` where applicable
- Buttons that are currently `<div onClick>`: convert to `<button>`

### aria-labels

| Element | Attribute |
|---------|-----------|
| All `<input>` / `<textarea>` | `aria-label` or `<label htmlFor>` association |
| PredictionWidget slider | `aria-label="Prediction"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow` |
| Star voting (Challenge 5) | `aria-label="Note pour [equipe]: [categorie]"` |
| SubmitButton loading | `aria-busy={true}` |
| PauseOverlay | `role="alertdialog"`, `aria-modal="true"`, `aria-label="Atelier en pause"` |

### aria-live regions

| Element | Value |
|---------|-------|
| Timer | `aria-live="polite"` |
| StreamedOutput content | `aria-live="polite"` |
| Toast | `role="status"`, `aria-live="assertive"` |
| Retry message | `aria-live="polite"` |
| DegradedBanner | `role="alert"` |

### Focus-visible

Add to `globals.css`, applied globally:

```css
a:focus-visible,
button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid #2D5A3D;
  outline-offset: 2px;
}
```

---

## 8. Auto-Save with localStorage (H)

### Where it applies

| Page | Key | What's saved | Restore UX |
|------|-----|-------------|------------|
| Challenge 1 | `c1-predictions` | Prediction slider values (before lock) | Pre-fill sliders |
| Challenge 2 | `c2-contributions` | TurnByTurnPanel textarea contents | Pre-fill textareas + toast "Brouillon restaure" |
| Challenge 3 | `c3-progress` | Case index + selected biases + rewrite text | Resume at same case, restore selections |
| Challenge 4 | `c4-instructions` | Instruction fields for regeneration | Pre-fill inputs |
| Challenge 5 | `c5-pact-answers` | 5 pact question textareas | Pre-fill textareas + toast |
| Porte | `porte-chat` | Chat message history (user + assistant) | Restore conversation on reload |

### Lifecycle

1. Save starts on first user input
2. Writes every 5s if value changed (shallow JSON comparison)
3. On successful Supabase submission: `clear()` removes the draft
4. On restore with textarea content: show info toast "Brouillon restaure"
5. On restore with non-textarea content (sliders): silent restore, no toast
6. No save when phase is "results" or "done"

### Not saved

- Streaming output (re-generated on reload)
- Locked predictions (already persisted to Supabase)
- Votes (immediate submission, nothing to draft)

---

## Files Changed Summary

### New files (8)

| File | Type |
|------|------|
| `components/shared/Spinner.tsx` | Component |
| `components/shared/Skeleton.tsx` | Component |
| `components/shared/Toast.tsx` | Component + Provider |
| `components/shared/FadeTransition.tsx` | Component |
| `lib/hooks/useToast.ts` | Hook |
| `lib/hooks/useAutoSave.ts` | Hook |
| `lib/hooks/useRetry.ts` | Hook |
| `docs/superpowers/specs/2026-06-07-ux-polish-design.md` | This spec |

### Modified files (~20)

| File | Changes |
|------|---------|
| `app/layout.tsx` | Wrap with `<ToastProvider>` |
| `app/globals.css` | Add focus-visible styles, spinner keyframes |
| `app/(public)/page.tsx` | Spinner on button, aria-label on input |
| `app/(public)/join/page.tsx` | Spinner, retry logic, error messages |
| `app/(team)/porte/page.tsx` | Retry on SSE, auto-save chat, spinner, accessibility |
| `app/(team)/lobby/page.tsx` | Minor accessibility fixes |
| `app/(team)/challenge/1/page.tsx` | Skeleton, fade, auto-save, accessibility |
| `app/(team)/challenge/2/page.tsx` | Skeleton, fade, auto-save, responsive, accessibility |
| `app/(team)/challenge/3/page.tsx` | Skeleton, fade, auto-save, accessibility |
| `app/(team)/challenge/4/page.tsx` | Skeleton, fade, auto-save, accordion, accessibility |
| `app/(team)/challenge/5/page.tsx` | Fade, auto-save, toast, accessibility |
| `app/(admin)/control/page.tsx` | Spinner, toast, table semantics |
| `app/(admin)/dashboard/page.tsx` | Skeleton, responsive grid, table semantics, reconnect banner |
| `components/shared/SubmitButton.tsx` | Spinner, aria-busy |
| `components/shared/StreamedOutput.tsx` | Skeleton, aria-live, retry message slot |
| `components/shared/PredictionWidget.tsx` | aria-labels, touch targets, flex-wrap |
| `components/shared/Timer.tsx` | aria-live |
| `components/PauseOverlay.tsx` | role, aria-modal, aria-label |
| `components/challenges/shared/TurnByTurnPanel.tsx` | Auto-save integration, label associations |
| `components/challenges/DocumentCamille.tsx` | Scroll fade indicator |
