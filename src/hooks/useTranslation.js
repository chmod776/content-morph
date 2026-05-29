import { useSettings } from '../context/SettingsContext';
import { getTranslations } from '../i18n';

export function useTranslation() {
  const { settings } = useSettings();
  return getTranslations(settings.outputLanguage);
}
