import { LOCALES, type Locale, useLocale, useMessages } from './i18n';
import { type Option, Segmented } from './Segmented';

const OPTIONS: Option<Locale>[] = LOCALES.map((locale) => ({ value: locale, label: locale.toUpperCase() }));

export function LanguageSwitch() {
  const m = useMessages();
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  return <Segmented label={m.menu.language} options={OPTIONS} value={locale} onChange={setLocale} />;
}
