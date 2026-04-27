import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

/**
 * Scale for widths and horizontal elements
 */
export const s = (size: number) => scale(size);

/**
 * VerticalScale for heights and vertical spacings
 */
export const vs = (size: number) => verticalScale(size);

/**
 * ModerateScale for fonts, borderRadius and fine adjustments
 */
export const ms = (size: number, factor?: number) => moderateScale(size, factor);

/**
 * ModerateVerticalScale for vertical elements that shouldn't scale too much
 */
export const mvs = (size: number, factor?: number) => moderateScale(size, factor); // Size matters doesn't have mvs by default in standard export normally, but we can standardize here

export { scale, verticalScale, moderateScale };
