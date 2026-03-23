# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
npx tsc --noEmit # Type-check without building
```

No test framework is configured.

## Architecture

**Single-page app** — navigation is driven entirely by `activeSection` in Zustand store, not Next.js routing. All sections render on one page at `/`. No URL changes occur between sections.

**State** lives exclusively in `/src/store/gameStore.ts` (Zustand + `persist` middleware → `localStorage` key `questlog-storage`). Cloud sync is a debounced 3-second push to Firestore on every store change; pull happens once on login. Device-specific state (`activeSection`, `showLevelUp`, `googleFitTokens`) is excluded from cloud sync.

**Types** all live in `/src/types/index.ts`.

**AI** is handled by a single API route `/src/app/api/gemini/route.ts` using Gemini 2.5-flash. It accepts a `mode` field (`standard_chat`, `generate_gym_plan`, `generate_meal_plan`, `suggest_meals`, `analyze_food`, `analyze_food_image`) and section-specific context.

**Theming** uses CSS custom properties with a `--ql-` prefix (`--ql-bg`, `--ql-accent`, etc.) set via `data-theme` attribute. Tailwind classes reference these as `bg-ql-bg`, `text-ql-accent`, etc. Never hardcode colours — use `ql-*` tokens.

**The pixel character** (`/src/app/components/character/PixelCharacter.tsx`) is a pure SVG rendered from a 16×33 programmatic grid. All visual appearance options are driven by `CharacterAppearance` from the store. `imageRendering: pixelated` is set on the SVG.

## Key Patterns

**Adding a new top-level section**: add state/setter to `GameStore` interface + initial state + action in `gameStore.ts` → create component folder under `/src/app/components/` → add nav entry in `NavBar.tsx` → add render branch in `page.tsx`.

**IDs**: system-defined builtins use kebab-case with a `builtin-` prefix (e.g. `builtin-steps`). User-generated IDs use `generateId()` (random 7-char base36).

**Dates**: always `YYYY-MM-DD` strings. Times: always `HH:MM` 24-hour strings.

**Cascading deletes** are handled entirely in store actions — there are no database-level constraints.

**Habit ↔ gym cross-sync**: logging a fitness habit auto-creates a gym session and vice versa. Fitness detection is regex-based on habit name/emoji in `gameStore.ts`.

**Persist merge** in `gameStore.ts` is the right place to inject built-in entities (e.g. `builtin-floors`) for existing users who predate the feature — check the existing pattern before adding new builtins.

**Custom images on habits** are stored as `data:` URL strings in `HabitDef.emoji`. The `HabitEmoji` shared component (`/src/app/components/shared/HabitEmoji.tsx`) handles rendering either an emoji string or a `data:` image transparently — use it everywhere `habit.emoji` is rendered.

## Store Shape (key fields)

```
stats          — XP, level, STR/CON/DEX/GOLD
habitDefs      — habit definitions (schedule, emoji, color, linked stats)
habitLog       — completed habit entries
gymPlans       — workout plan definitions
gymSessions    — completed gym sessions
stepLog        — daily step entries
gpsActivities  — GPS route recordings (includes floorsClimbed)
waterLog       — hydration entries
mealLog        — food log entries
wakeQuest      — wake-up target + check-ins
sleepLog       — sleep entries
vices          — vice log entries
calendarEvents — calendar entries
performanceStats / performanceLog — custom tracked metrics
loginStreak / lastOpenedDate — app-open streak (incremented via recordAppOpen())
nutritionTab   — 'food' | 'drink' (deep-links FoodDrink tabs)
trainingTab    — 'habits' | 'plans' | 'performance' | 'steps'
```
