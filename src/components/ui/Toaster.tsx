"use client";

import { useToastStore } from "@/stores/toastStore";

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-[min(420px,calc(100vw-32px))] pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto text-left rounded-lg border px-3 py-2 text-[12px] shadow-lg transition-opacity hover:opacity-95 ${
            t.variant === "error"
              ? "bg-red-50 border-red-200 text-red-900"
              : "bg-white border-gray-200 text-gray-800"
          }`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
