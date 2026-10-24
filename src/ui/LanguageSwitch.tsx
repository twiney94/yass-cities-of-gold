import { FrFlag, UsFlag } from './art/flags';
import { type Locale, useLocale, useMessages } from './i18n';
import { type Option, Segmented } from './Segmented';

const OPTIONS: Option<Locale>[] = [
  { value: 'en', label: 'English', icon: <UsFlag /> },
  { value: 'fr', label: 'Français', icon: <FrFlag /> },
];

export function LanguageSwitch() {
  const m = useMessages();
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  return <Segmented className="segmented--flags" label={m.menu.language} options={OPTIONS} value={locale} onChange={setLocale} />;
}
