/** Shared breakpoint for phone/tablet shell layout. */
export const PLATFORM_MOBILE_MAX_WIDTH_PX = 768

export function platformMobileMediaQuery(): string {
  return `(max-width: ${PLATFORM_MOBILE_MAX_WIDTH_PX}px)`
}
