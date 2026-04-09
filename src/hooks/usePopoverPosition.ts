"use client";

import { useLayoutEffect, RefObject } from "react";

export function usePopoverPosition(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean
) {
  useLayoutEffect(() => {
    if (!isOpen || !ref.current) return;

    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    if (rect.bottom > vh - 8) {
      el.style.top = "auto";
      el.style.bottom = "100%";
      el.style.marginBottom = "4px";
      el.style.marginTop = "0";
    }

    if (rect.right > vw - 8) {
      el.style.left = "auto";
      el.style.right = "0";
    }
  }, [isOpen, ref]);
}
