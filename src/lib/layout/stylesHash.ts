import { fnv1aHash, stableJoin } from "./hash";

export type StyleFingerprintInput = {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  fontWeight: string;
  textAlign: string;
  marginLeft: string;
  textIndent: string;
  wordBreak: string;
  overflowWrap: string;
  widthPx: number;
  zoom: number;
  dpr: number;
};

export function readStyleFingerprint(
  element: HTMLElement,
  widthPx: number,
  zoom: number,
): StyleFingerprintInput {
  const cs = getComputedStyle(element);
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  return {
    fontFamily: cs.fontFamily,
    fontSize: cs.fontSize,
    lineHeight: cs.lineHeight,
    letterSpacing: cs.letterSpacing,
    fontWeight: cs.fontWeight,
    textAlign: cs.textAlign,
    marginLeft: cs.marginLeft,
    textIndent: cs.textIndent,
    wordBreak: cs.wordBreak,
    overflowWrap: cs.overflowWrap,
    widthPx,
    zoom,
    dpr,
  };
}

export function computeStylesHash(input: StyleFingerprintInput): string {
  return fnv1aHash(
    stableJoin([
      input.fontFamily,
      input.fontSize,
      input.lineHeight,
      input.letterSpacing,
      input.fontWeight,
      input.textAlign,
      input.marginLeft,
      input.textIndent,
      input.wordBreak,
      input.overflowWrap,
      Math.round(input.widthPx),
      input.zoom,
      input.dpr,
    ]),
  );
}

