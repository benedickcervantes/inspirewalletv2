import { Dimensions, useWindowDimensions } from 'react-native';
import { useMemo } from 'react';

/**
 * Responsive layout utilities for different screen sizes.
 * Use useResponsive() in screens and pass horizontalPadding to ScrollView contentContainerStyle,
 * and scale/verticalScale for fixed pixel values (logos, icons, heights) so layouts adapt to
 * small phones, large phones, and tablets.
 *
 * Design baseline (e.g. iPhone 14 / common mobile).
 */
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

const getWindow = () => Dimensions.get('window');

/**
 * Scale a horizontal size by screen width. Use for widths, horizontal padding, font sizes (with care).
 */
export function scale(size: number, width?: number): number {
  const w = width ?? getWindow().width;
  return (w / BASE_WIDTH) * size;
}

/**
 * Scale a vertical size by screen height. Use for heights, vertical padding.
 */
export function verticalScale(size: number, height?: number): number {
  const h = height ?? getWindow().height;
  return (h / BASE_HEIGHT) * size;
}

/**
 * Moderate scale: less aggressive than scale, good for font sizes and touch targets.
 * factor: 0.5 = halfway between no scaling and full scale.
 */
export function moderateScale(size: number, factor: number = 0.5, width?: number): number {
  const w = width ?? getWindow().width;
  const s = (w / BASE_WIDTH) * size;
  return size + (s - size) * factor;
}

/**
 * Hook that returns current dimensions and scaling helpers so layouts react to orientation/size changes.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  return useMemo(
    () => ({
      width,
      height,
      scale: (size: number) => scale(size, width),
      verticalScale: (size: number) => verticalScale(size, height),
      moderateScale: (size: number, factor?: number) => moderateScale(size, factor, width),
      /** True when width < 330 (very small phones, e.g. 320px). */
      isTinyScreen: width < 330,
      /** True when width <= 390 (small phones incl. iPhone SE 2nd gen 375px). */
      isSmallScreen: width <= 390,
      /** True when height is short (e.g. iPhone SE 568, 667, landscape). */
      isShortScreen: height < 700,
      /** True when width >= 600 (tablets, large phones). */
      isLargeScreen: width >= 600,
      /** Horizontal padding that adapts to width (12 on tiny, 14 on small, 18–24 on larger). */
      horizontalPadding: width < 330 ? 12 : width < 360 ? 14 : width < 400 ? 18 : 24,
    }),
    [width, height]
  );
}
