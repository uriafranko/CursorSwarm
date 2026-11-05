export type CursorMode = "arrow" | "crosshair" | "ibeam" | "pen" | "duplicate";

/** Hotspot of each cursor inside its 24×24 box: the pixel that "is" the pointer. */
export const HOTSPOT: Record<CursorMode, [number, number]> = {
  arrow: [4, 3],
  crosshair: [12, 12],
  duplicate: [4, 3],
  ibeam: [12, 12],
  pen: [4, 4],
};

const OUTLINE = `stroke="#fff" stroke-linejoin="round" stroke-linecap="round"`;

const ARROW = `<path d="M4 3 L20.6 10.3 L12.9 12.9 L10.3 20.6 Z" fill="currentColor" ${OUTLINE} stroke-width="1.7"/>`;

/** Two passes: a wide white stroke under a thin colored one keeps thin cursors readable on any background. */
const stroked = (d: string, width = 1.8): string =>
  `<path d="${d}" fill="none" ${OUTLINE} stroke-width="${width + 2.4}"/><path d="${d}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="${width}"/>`;

const SHAPES: Record<CursorMode, string> = {
  arrow: ARROW,
  crosshair: stroked("M12 3.5v5.5M12 15v5.5M3.5 12H9M15 12h5.5"),
  duplicate:
    `${ARROW}<circle cx="18.2" cy="18.2" r="4.4" fill="currentColor" ${OUTLINE} stroke-width="1.4"/>` +
    `<path d="M18.2 16.2v4M16.2 18.2h4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>`,
  ibeam: stroked("M9.3 4.5h5.4M12 4.5v15M9.3 19.5h5.4", 1.6),
  pen:
    `<path d="M4 4 L14.2 7.4 L17.4 13.6 L13.6 17.4 L7.4 14.2 Z" fill="currentColor" ${OUTLINE} stroke-width="1.5"/>` +
    `<path d="M4.6 4.6 L9.6 9.6" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>` +
    `<circle cx="10.4" cy="10.4" r="1.4" fill="#fff"/>` +
    `<path d="M16.1 18.7 L18.7 16.1 L21.2 18.6 L18.6 21.2 Z" fill="currentColor" ${OUTLINE} stroke-width="1.4"/>`,
};

export const cursorMarkup = (mode: CursorMode): string => SHAPES[mode];
