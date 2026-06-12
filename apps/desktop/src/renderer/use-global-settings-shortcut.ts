import { useEffect } from 'react';

export function useGlobalSettingsShortcut(onOpenSettings: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || !(event.metaKey || event.ctrlKey) || event.key !== ',') {
        return;
      }

      event.preventDefault();
      onOpenSettings();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSettings]);
}
