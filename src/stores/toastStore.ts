import { create } from "zustand";

export type ToastVariant = "info" | "error";

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, variant = "info") => {
    const id = nextId++;
    set((s) => ({
      toasts: [...s.toasts, { id, message, variant }],
    }));
    const duration = variant === "error" ? 8000 : 5000;
    window.setTimeout(() => {
      useToastStore.getState().dismiss(id);
    }, duration);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
