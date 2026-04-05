import { useCallback, useEffect, useState } from 'react';

/**
 * Distance from the layout viewport bottom to the visual viewport bottom.
 * On mobile, the visual viewport shrinks when the on-screen keyboard opens — use this
 * to pin fixed/absolute bottom UI (e.g. chat composer) above the keyboard.
 */
export function useVisualViewportBottomInset(enabled: boolean) {
  const [bottomInset, setBottomInset] = useState(0);

  const updateInset = useCallback(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    setBottomInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
  }, []);

  useEffect(() => {
    if (!enabled) {
      setBottomInset(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;
    vv.addEventListener('resize', updateInset);
    vv.addEventListener('scroll', updateInset);
    updateInset();
    return () => {
      vv.removeEventListener('resize', updateInset);
      vv.removeEventListener('scroll', updateInset);
    };
  }, [enabled, updateInset]);

  /** iOS: first focus on an input often applies keyboard before visualViewport resize fires */
  const remeasureForKeyboardFocus = useCallback(() => {
    if (!enabled) return;
    updateInset();
    requestAnimationFrame(() => {
      updateInset();
      requestAnimationFrame(updateInset);
    });
    window.setTimeout(updateInset, 80);
    window.setTimeout(updateInset, 280);
  }, [enabled, updateInset]);

  return { bottomInset, updateInset, remeasureForKeyboardFocus };
}
