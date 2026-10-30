import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Phone vs desktop, decided by the same media query the CSS uses. window.innerWidth is
 * not trusted here: in-app browsers (Teams, Instagram, etc.) can report the width of
 * overflowing content instead of the screen, which flipped phones onto the desktop board.
 */
function isPhone() {
  const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
  const screenWidth = Math.min(window.screen?.width || Infinity, document.documentElement.clientWidth || Infinity);
  return query || screenWidth < MOBILE_BREAKPOINT;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(isPhone());
    mql.addEventListener("change", onChange);
    window.addEventListener("resize", onChange);
    onChange();
    return () => {
      mql.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, []);

  return !!isMobile;
}
