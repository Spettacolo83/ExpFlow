# ExpFlow

**Smart personal expense tracker with on-device OCR and AI-powered categorization.**

ExpFlow lets freelancers and small business owners track expenses without tedious manual entry: scan a receipt, and the app extracts the amount, date and merchant with on-device OCR, then suggests a category using an LLM. Everything stays on the device — the only data that ever leaves it is the receipt text sent for categorization.

> ⚠️ **Status:** work in progress. This is an MVP built in the open to showcase mobile architecture, clean code and a privacy-first design. See the [Roadmap](#roadmap).

---

## Features

- 📷 **Receipt scanning** — full-screen camera with framing guide and on-device OCR (Google ML Kit on Android, Apple Vision on iOS).
- 🧠 **AI categorization** — merchant and line items are categorized by an LLM, with a local learning cache for recurring merchants.
- ✍️ **Manual entry** — quick form with smart category suggestions.
- 📊 **Dashboard & stats** — monthly totals, per-category breakdown and month-over-month trends.
- 🗂️ **Expense management** — filterable list, detail view, edit and swipe-to-delete.
- 📤 **CSV export** — full data portability (GDPR-friendly).
- 🌙 **Dark mode** — follows the system appearance.
- 🌍 **Localized** — English, Italian and Spanish.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | React Native (Expo SDK 58) |
| Language | TypeScript (strict) |
| Navigation | Expo Router (file-based) |
| Local storage | SQLite (`expo-sqlite`) |
| OCR | ML Kit / Apple Vision (on-device) |
| LLM | Groq (`llama-3.3-70b-versatile`) |
| Animations | React Native Reanimated |

## Architecture

```
src/
├── app/                 # Expo Router screens (file-based routing)
│   └── (tabs)/          # Home · Expenses · Stats · Settings
├── components/          # UI components (Dashboard, Scan, Charts, Common)
├── services/            # OCR, LLM, receipt parser, database, CSV export
├── stores/              # State management
├── constants/           # Design tokens, categories, LLM prompts
├── locales/             # i18n resources (en, it, es)
└── types/               # Shared TypeScript types
```

Design decisions and layering are documented inline and kept close to the code they describe.

## Getting started

### Prerequisites

- Node.js 20+
- A [Groq API key](https://console.groq.com/keys) (free tier)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# then add your Groq API key to .env

# 3. Start the development server
npx expo start
```

Open the app in the Expo Go sandbox, an emulator/simulator, or a development build.

> **Note:** features that rely on native modules (camera, OCR) require a
> [development build](https://docs.expo.dev/develop/development-builds/introduction/)
> rather than Expo Go.

### Quality checks

```bash
npx tsc --noEmit    # type-check
npx expo lint       # lint
npx expo-doctor     # dependency & config diagnostics
```

## Privacy

ExpFlow is privacy-first by design:

- Receipt photos, extracted text and categories are stored **only on the device**.
- The single network call is the categorization request to Groq, which receives **text only** (no images, no personal identifiers).
- Users can opt out of storing receipt photos, export all their data, and wipe everything from Settings.

## Roadmap

- [x] Project foundation — design system, SQLite schema, navigation
- [ ] Receipt scanning — camera, OCR and parsing
- [ ] LLM categorization with local merchant cache
- [ ] Dashboard, expense CRUD and statistics
- [ ] CSV export and full settings
- [ ] Onboarding and polish
- [ ] Store release (App Store & Google Play)

## License

[MIT](./LICENSE) © Stefano Russello
