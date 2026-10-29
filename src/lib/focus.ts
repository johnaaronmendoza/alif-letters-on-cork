import { useEffect, useRef } from "react";

/**
 * Moves keyboard focus into a dialog when it opens, keeps Tab inside it, and puts
 * focus back where it was (e.g. the envelope that was tapped) when it closes.
 */
export function useDialogFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const focusables = () =>
      root ? [...root.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null) : [];
    // focus the dialog itself, so a phone keyboard doesn't pop up
    root?.focus({ preventScroll: true });
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !root) return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0]!, last = items[items.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      opener?.focus?.({ preventScroll: true });
    };
  }, []);
  return ref;
}
