import i18n from 'i18next';
import { getLocales } from 'expo-localization';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import es from '@/locales/es.json';
import it from '@/locales/it.json';

export const SUPPORTED_LANGUAGES = ['en', 'it', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Resolve the device language to one we support, falling back to English. */
function resolveDeviceLanguage(): SupportedLanguage {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code)
    ? (code as SupportedLanguage)
    : 'en';
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      it: { translation: it },
      es: { translation: es },
    },
    lng: resolveDeviceLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    // Resources are bundled inline, so init runs synchronously; make that
    // explicit and avoid a dangling init() promise.
    initAsync: false,
  });
}

export default i18n;
