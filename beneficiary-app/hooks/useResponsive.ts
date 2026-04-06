import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const breakpoint: Breakpoint =
    width < 480 ? 'mobile' : width < 768 ? 'tablet' : 'desktop';

  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const isDesktop = breakpoint === 'desktop';

  // Content max-width to keep things readable on large screens
  // Use a very large number for mobile to effectively be unconstrained
  const contentMaxWidth = isMobile ? 9999 : isTablet ? 540 : 460;

  // Dynamic padding that scales with screen
  const screenPadding = isMobile ? 16 : isTablet ? 24 : 32;

  // Scale factor for font sizes & spacing
  const scale = isMobile ? 1 : isTablet ? 1.05 : 1.1;

  return {
    width,
    height,
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    contentMaxWidth,
    screenPadding,
    scale,
  };
}
