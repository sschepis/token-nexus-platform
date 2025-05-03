
import { useAppStore } from '@/store/appStore';
import { usePageBuilderStore } from '@/store/pageBuilderStore';
import { useThemeStore } from '@/store/themeStore';

// Custom hook to access all stores in one place
export function useStore() {
  const appStore = useAppStore();
  const pageBuilderStore = usePageBuilderStore();
  const themeStore = useThemeStore();

  return {
    app: appStore,
    pageBuilder: pageBuilderStore,
    theme: themeStore,
  };
}
