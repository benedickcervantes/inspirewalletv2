/**
 * Responsive utilities for Android & iOS
 * Ensures layouts scale correctly across all device sizes
 */
import { useWindowDimensions, DimensionValue } from "react-native";

const MIN_TOUCH_TARGET = 44; // iOS/Android accessibility minimum
const SMALL_SCREEN_BREAKPOINT = 375;
const LARGE_SCREEN_BREAKPOINT = 414;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isSmallScreen = width < SMALL_SCREEN_BREAKPOINT;
  const isLargeScreen = width >= LARGE_SCREEN_BREAKPOINT;

  // Horizontal padding: 16 on small, 20 on medium, 24 on large
  const horizontalPadding = isSmallScreen ? 16 : isLargeScreen ? 24 : 20;

  // Carousel/slide width (accounting for horizontal padding)
  const carouselWidth = width - horizontalPadding * 2;

  // Scale factor for fonts (0.9 on small, 1 on medium, 1.05 on large)
  const fontScale = isSmallScreen ? 0.9 : isLargeScreen ? 1.05 : 1;

  // Minimum touch target size (44x44 recommended for accessibility)
  const minTouchTarget = MIN_TOUCH_TARGET;

  // Scaled value: interpolate between base and max based on width
  const scale = (base: number, max?: number) => {
    if (max == null) return base * fontScale;
    const ratio = Math.min(1, (width - SMALL_SCREEN_BREAKPOINT) / (LARGE_SCREEN_BREAKPOINT - SMALL_SCREEN_BREAKPOINT));
    return base + (max - base) * Math.max(0, ratio);
  };

  // Percentage of width
  const wp = (percent: number): DimensionValue => `${percent}%`;

  // Percentage of height
  const hp = (percent: number): DimensionValue => `${percent}%`;

  return {
    width,
    height,
    isSmallScreen,
    isLargeScreen,
    horizontalPadding,
    carouselWidth,
    fontScale,
    minTouchTarget,
    scale,
    wp,
    hp,
  };
}

export { MIN_TOUCH_TARGET, SMALL_SCREEN_BREAKPOINT, LARGE_SCREEN_BREAKPOINT };
