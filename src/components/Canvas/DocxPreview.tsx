"use client";

import { useRef, useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { PAGE_CHROME } from "@/lib/page-layout";

interface DocxPreviewProps {
  data: ArrayBuffer;
}

export default function DocxPreview({ data }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLStyleElement>(null);
  const zoom = useUIStore((s) => s.zoom);
  const scale = zoom / 100;

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      const { renderAsync } = await import("docx-preview");
      if (cancelled || !containerRef.current) return;

      containerRef.current.innerHTML = "";
      await renderAsync(data, containerRef.current, styleRef.current ?? undefined, {
        className: "docx-preview-body",
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
        useBase64URL: true,
      });
    })();

    return () => { cancelled = true; };
  }, [data]);

  return (
    <div
      className="flex-1 overflow-auto"
      style={{ background: PAGE_CHROME.workspaceBackground }}
    >
      <style ref={styleRef as React.RefObject<HTMLStyleElement>} />
      <div
        ref={containerRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
        }}
      />
    </div>
  );
}
