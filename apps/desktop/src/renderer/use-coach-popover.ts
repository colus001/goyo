import { useEffect, useRef, useState } from 'react';

export function useCoachPopover() {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target))
        setOpen(false);
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.isComposing || event.keyCode === 229) return;
      setOpen(false);
      if (container.current?.contains(document.activeElement)) trigger.current?.focus();
    }
    window.addEventListener('pointerdown', dismissOutside);
    window.addEventListener('keydown', dismissOnEscape);
    return () => {
      window.removeEventListener('pointerdown', dismissOutside);
      window.removeEventListener('keydown', dismissOnEscape);
    };
  }, [open]);

  return { open, setOpen, container, trigger };
}
