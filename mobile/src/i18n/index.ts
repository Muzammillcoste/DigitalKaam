import { useCallback } from 'react';
import { useSettingsStore, type Language } from '@/store/settingsStore';
import { dictionaries, type TranslationKey } from './translations';

export type { TranslationKey } from './translations';

/** Languages whose script is written right-to-left. */
const RTL_LANGUAGES: Language[] = ['ur'];

export function isRTLLanguage(lang: Language): boolean {
  return RTL_LANGUAGES.includes(lang);
}

/**
 * Translate a key with optional `{name}`-style interpolation.
 * Falls back to English, then to the raw key, so a missing string is
 * always visible (and never crashes the UI).
 */
export function translate(
  lang: Language,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const value =
    dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? (key as string);
  if (!vars) return value;
  return Object.keys(vars).reduce(
    (acc, k) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k])),
    value,
  );
}

/**
 * Primary localization hook.
 *
 * `t`      — translate a key for the active language.
 * `lang`   — current language code.
 * `isRTL`  — true when the active language is right-to-left (Urdu).
 */
export function useTranslation() {
  const language = useSettingsStore((s) => s.language);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(language, key, vars),
    [language],
  );

  return { t, lang: language, isRTL: isRTLLanguage(language) };
}

/**
 * TextInput localization props.
 *
 * Important: React Native core exposes **no** cross-platform API to force the
 * OS keyboard's *input language* — which script the keyboard produces is
 * controlled by the keyboards the user has enabled in their device settings.
 * What we CAN do, and do here, is:
 *
 *   1. Render/enter text right-to-left for Urdu (`writingDirection` +
 *      `textAlign`), so Urdu input displays correctly.
 *   2. Keep `keyboardType: 'default'` so the OS shows the user's normal
 *      multi-language keyboard (a numeric/email keyboard would ignore the
 *      Urdu layout entirely), letting them pick the Urdu keyboard the device
 *      provides.
 *
 * Pass the result via `{...localizedInputProps(lang)}` onto a `TextInput`.
 */
export interface LocalizedInputProps {
  /** Matches the `TextInput` `textAlign` prop (narrower than the style type). */
  textAlign: 'left' | 'right';
  writingDirection: 'ltr' | 'rtl';
  keyboardType: 'default';
}

export function localizedInputProps(lang: Language): LocalizedInputProps {
  const rtl = isRTLLanguage(lang);
  return {
    textAlign: rtl ? 'right' : 'left',
    writingDirection: rtl ? 'rtl' : 'ltr',
    keyboardType: 'default',
  };
}

export function useLocalizedInputProps() {
  const language = useSettingsStore((s) => s.language);
  return localizedInputProps(language);
}
