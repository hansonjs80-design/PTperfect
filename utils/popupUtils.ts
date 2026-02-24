/**
 * Pre-compute a popup position that fits within the viewport.
 * Use this to get an initial position before the popup mounts,
 * eliminating the visual "jump" caused by measure-then-position patterns.
 */
export function computePopupPosition(
  clickPos: { x: number; y: number },
  width: number,
  height: number,
  options: {
    padding?: number;
    preferAbove?: boolean;
    centerOnClick?: boolean;
    gap?: number;
  } = {}
): { top: number; left: number } {
  const { padding = 8, preferAbove = false, centerOnClick = false, gap = 0 } = options;
  const sw = window.innerWidth;
  const sh = window.innerHeight;

  // Horizontal
  let left = centerOnClick ? clickPos.x - width / 2 : clickPos.x;
  if (left + width > sw - padding) left = sw - width - padding;
  if (left < padding) left = padding;

  // Vertical
  let top: number;
  if (preferAbove) {
    top = clickPos.y - height - gap;
    if (top < padding) top = clickPos.y + gap + 10;
    if (top + height > sh - padding) top = sh - height - padding;
  } else {
    top = clickPos.y + gap;
    if (top + height > sh - padding) top = clickPos.y - height - gap;
    if (top < padding) top = padding;
  }

  return { top, left };
}
