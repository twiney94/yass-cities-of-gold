import { create } from 'zustand';
import { type Messages, en } from './en';
import { fr } from './fr';
import { type Locale, pickLocale } from './locale';

export type { Messages } from './en';
export { LOCALES, type Locale } from './locale';

const MESSAGES: Record<Locale, Messages> = { en, fr };
const STORAGE_KEY = 'yass-cities-of-gold.locale';

const savedLocale = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const saveLocale = (locale: Locale) => {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch (error) {
    console.warn('The language choice could not be saved', error);
  }
};

const initial = pickLocale(savedLocale(), navigator.languages ?? [navigator.language]);
document.documentElement.lang = initial;

export const useLocale = create<{ locale: Locale; setLocale: (locale: Locale) => void }>((set) => ({
  locale: initial,
  setLocale: (locale) => {
    saveLocale(locale);
    document.documentElement.lang = locale;
    set({ locale });
  },
}));

export const useMessages = (): Messages => MESSAGES[useLocale((s) => s.locale)];
