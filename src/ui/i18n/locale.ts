export type Locale = 'en' | 'fr';

export const LOCALES: readonly Locale[] = ['en', 'fr'];

const isLocale = (value: string | null | undefined): value is Locale => LOCALES.includes(value as Locale);

export const pickLocale = (saved: string | null, languages: readonly string[]): Locale => {
  if (isLocale(saved)) return saved;
  for (const language of languages) {
    const base = language.toLowerCase().split('-')[0];
    if (isLocale(base)) return base;
  }
  return 'en';
};
