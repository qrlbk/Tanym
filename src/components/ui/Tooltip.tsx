"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={450} skipDelayDuration={200}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

const contentClass =
  "z-[200] max-w-[min(280px,calc(100vw-16px))] rounded-md border border-gray-700/80 bg-gray-900 px-2.5 py-1.5 text-[11px] leading-snug text-gray-100 shadow-lg";

export function Tooltip({
  children,
  content,
  side = "bottom",
  align = "center",
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          className={contentClass}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-gray-900" width={10} height={5} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
