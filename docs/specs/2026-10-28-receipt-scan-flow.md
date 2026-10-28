# Design — Receipt Scan Flow

**Date:** 2026-10-28
**Status:** Approved
**Scope:** Capture a receipt, extract its text on-device, parse the key fields, let the user review a pre-filled form, and persist the expense to SQLite. Localized UI (EN/IT/ES) from the start.

## Goal

Deliver the core value loop of ExpFlow end-to-end, from the Home "+" action to a saved expense:

```
FAB "+" → Scan receipt → capture photo → OCR → parse → pre-filled form → save → SQLite
                     ↘ Manual entry ────────────────────→ empty form ───↗
```

LLM categorization (Groq) and the reactive dashboard are explicitly **out of scope** for this slice (see [Out of scope](#out-of-scope)).

## Non-goals / Out of scope

- **LLM categorization (Groq):** the form shows a category picker defaulting to `other`; automatic suggestion is a later slice.
- **Reactive dashboard / expense list UI:** saving writes to SQLite; surfacing the data on Home and the Expenses tab is a later slice.
- **Global state (Zustand):** this slice writes through the service layer directly. A `expensesStore` / `settingsStore` / `categoriesStore` will be introduced when reactive, app-wide state is actually needed (dashboard/CRUD slice). Tracked as technical debt.
- **In-app language switcher:** language is auto-detected from the device this slice; the Settings control to override it comes with the Settings slice.

## New dependencies

| Package | Purpose | Notes |
| --- | --- | --- |
| `expo-camera` | Photo capture | First-party; config plugin for permissions |
| `@react-native-ml-kit/text-recognition` | On-device OCR | Google ML Kit (iOS + Android); requires a dev build |
| `expo-file-system` | Persist kept receipt photos | Already in the planned stack |
| `expo-localization` | Device locale detection | First-party |
| `i18next`, `react-i18next` | Localization framework | EN/IT/ES |
| `jest-expo` (dev) | Unit tests for the parser | |

All installed via `npx expo install` where applicable to pin SDK-compatible versions.

> **Dev build required:** the OCR native module means the app no longer runs in Expo Go. Iterate with local builds (`npx expo run:android` first, then `npx expo run:ios`); validate scanning on a **real device** (emulators/simulators have no real camera). The `ios/`/`android/` folders stay generated (CNG) and git-ignored.

## Localization (EN / IT / ES)

- **Init module** `src/i18n/index.ts`: configures `i18next` with `react-i18next`, resources loaded from `src/locales/{en,it,es}.json`, language resolved from `expo-localization` device locale with **EN fallback**. Imported once from the root layout before render.
- **Resource files** `src/locales/en.json`, `it.json`, `es.json`: namespaced keys for `common`, `scan`, `form`, `permissions`, `categories` (the 7 default category display names, keyed by the stable category id from `constants/categories.ts`).
- All user-facing strings in new screens go through `t()`. No hardcoded copy.
- iOS permission strings (`NSCameraUsageDescription`) are set in `app.json`; English is acceptable for the store metadata at this stage.

## Screens & navigation

Routes are added to the root stack in `src/app/_layout.tsx`, presented over the tabs.

- **`src/app/scan.tsx`** — full-screen camera.
  - Framing-guide overlay (`components/Scan/OverlayGuide.tsx`).
  - Capture button; on capture → show a loading state (`scan.analyzing` string) while OCR runs.
  - Permission handling: if not granted, request; if denied, show rationale + "Open settings" button.
  - Presented as a full-screen stack screen.
- **`src/app/expense-form.tsx`** — review / edit / save.
  - Fields: amount, date, merchant, category (picker, default `other`), notes, "Keep photo" toggle.
  - Receives parsed data + `photoUri` + `rawOcrText` via route params (also reachable empty, for manual entry).
  - Presented as a modal.
- **Home FAB** (`components/Common/Fab.tsx`): "+" opens an action sheet with **Scan receipt** → `/scan` and **Manual entry** → `/expense-form`.

## Services (isolated, testable units)

- **`src/services/ocr.ts`** — `recognizeText(uri: string): Promise<string>`. Thin wrapper over ML Kit; returns the concatenated raw text. Isolates the native dependency behind one function so the rest of the app (and tests) never touch ML Kit directly.
- **`src/services/parser.ts`** — `parseReceipt(text: string, locale: Language): ParsedReceipt`. **Pure function**, no I/O. Responsibilities:
  - **Total:** locale-aware amount detection. Prefer lines containing a total keyword (`TOTALE`, `TOTAL`, `IMPORTO`, `TOTAL A PAGAR`, …); else the largest plausible monetary value. Handle `1.234,56` (IT/ES) vs `1,234.56` (EN) decimal/grouping.
  - **Date:** match `DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY`, `YYYY-MM-DD`; normalize to ISO `YYYY-MM-DD`; fallback to today.
  - **Merchant:** heuristic over the first non-empty lines (uppercase ratio, length, excluding address/VAT lines).
  - Returns `{ amount: number | null, date: string, merchant: string | null, confidence }`. Never throws; missing fields come back null/today.
- **`src/services/database.ts`** — add:
  - `insertExpense(input: NewExpense): Promise<Expense>` — generates id + timestamps, inserts, returns the row.
  - `upsertMerchant(name: string, category?: string): Promise<void>` — records/`times_seen++` for the merchant (foundation for the future LLM cache).
  - `getExpenses(): Promise<Expense[]>` — read-back, used for manual verification and the later list slice.
  - A snake_case ↔ camelCase row mapper so callers work with the `Expense` type.

```
ParsedReceipt  (services/parser.ts)
  amount: number | null
  date: string            // ISO, defaults to today
  merchant: string | null
  confidence: { amount: number; date: number; merchant: number }
```

## Data flow

1. `scan.tsx` → `Camera.takePictureAsync()` → local file URI.
2. `ocr.recognizeText(uri)` → raw text (on-device, offline-capable).
3. `parser.parseReceipt(text, locale)` → `ParsedReceipt`.
4. `router.push('/expense-form', { amount, date, merchant, photoUri, rawOcrText })`.
5. User edits → **Save**.
6. If "Keep photo" is on, move the cached photo into `FileSystem.documentDirectory` and store its URI; otherwise drop it (`photoUri = null`).
7. `database.insertExpense(...)` (+ `upsertMerchant`) → navigate back.

## Error handling (never block the user)

- **Camera permission denied:** rationale screen + "Open settings" (`Linking.openSettings()`).
- **OCR fails or returns empty:** proceed to the form with `date = today` and empty editable fields; show a non-blocking notice.
- **Partial parse:** fill what was found; leave the rest for manual input.
- **Save validation:** amount required and numeric (locale-tolerant input), date valid, category required (defaults to `other`).
- **Offline:** OCR runs on-device, so the whole flow works without connectivity (no network call in this slice).

## Testing

- **Unit (Jest + `jest-expo`):** `services/parser.ts` against realistic receipt text samples — IT totals with comma decimals, mixed date formats, multi-line merchants, and a garbage/empty input asserting safe fallbacks. The parser is pure, so this is fast and deterministic.
- **Manual on device:** camera + OCR verified on a real Android device first, then a real iPhone. Manual-entry path is verifiable on a simulator (no camera needed), de-risking the form + save independently of OCR.

## File map (new / changed)

```
app.json                                  # camera plugin + permission strings
src/i18n/index.ts                         # new — i18next init
src/locales/{en,it,es}.json               # new — translation resources
src/services/ocr.ts                       # new
src/services/parser.ts                    # new
src/services/__tests__/parser.test.ts     # new
src/services/database.ts                  # changed — insertExpense, upsertMerchant, getExpenses
src/app/_layout.tsx                        # changed — i18n init, register scan + expense-form
src/app/scan.tsx                          # new
src/app/expense-form.tsx                   # new
src/components/Scan/OverlayGuide.tsx       # new
src/components/Common/Fab.tsx              # new
src/components/Common/{Button,Input,CategoryPicker}.tsx  # new — form building blocks
src/app/(tabs)/index.tsx                   # changed — add FAB entry point
```

## Open follow-ups (tracked, not in this slice)

- Groq LLM categorization + merchant-based cache.
- Zustand stores (reactive state).
- Dashboard & expense list wiring.
- In-app language + currency settings.
