/**
 * App language / locale settings.
 * Default: English. Supported: English, Korean, Japanese, Arabic.
 * English is always the fallback when no preference is set or stored value is invalid.
 */

/** Default app language (used on first launch and when no valid preference is stored). */
export const DEFAULT_LANGUAGE = "English";

/** Language options with label, code, and flag emoji for map/selector UI */
export const SUPPORTED_LANGUAGES = [
  { label: "English", code: "en", flag: "🇺🇸" },
  { label: "Korean", code: "ko", flag: "🇰🇷" },
  { label: "Japanese", code: "ja", flag: "🇯🇵" },
  { label: "Arabic", code: "ar", flag: "🇸🇦" },
] as const;

export type SupportedLanguageLabel = (typeof SUPPORTED_LANGUAGES)[number]["label"];
export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export function getLanguageCode(label: string): string {
  const found = SUPPORTED_LANGUAGES.find(
    (l) => l.label.toLowerCase() === label.toLowerCase()
  );
  return found?.code ?? "en";
}

export function getLanguageLabel(code: string): string {
  const found = SUPPORTED_LANGUAGES.find(
    (l) => l.code.toLowerCase() === code.toLowerCase()
  );
  return found?.label ?? "English";
}

/** AsyncStorage key prefix for "user has chosen language" (first-time modal). Use with accountNumber: languageChoiceDoneKey(accountNumber). */
export const LANGUAGE_CHOICE_DONE_KEY_PREFIX = "language_chosen_";

export function languageChoiceDoneKey(accountNumber: string | undefined): string {
  return accountNumber ? `${LANGUAGE_CHOICE_DONE_KEY_PREFIX}${accountNumber}` : `${LANGUAGE_CHOICE_DONE_KEY_PREFIX}global`;
}

/** Ensures the value is a supported language; otherwise returns default English. */
export function normalizeLanguage(value: string | null | undefined): string {
  if (!value || typeof value !== "string") return DEFAULT_LANGUAGE;
  const found = SUPPORTED_LANGUAGES.find(
    (l) => l.label.toLowerCase() === value.trim().toLowerCase()
  );
  return found ? found.label : DEFAULT_LANGUAGE;
}
