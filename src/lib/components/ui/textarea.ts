import { cn } from "$lib/utils";
import type { ComponentProps } from "svelte";

export interface TextareaProps extends ComponentProps<"textarea"> {
  class?: string;
}

export function textareaVariants() {
  return {
    base: "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  };
}

export function getTextareaClass(variants: ReturnType<typeof textareaVariants>, className?: string) {
  return cn(variants.base, className);
}
