<script lang="ts">
  import { cn } from "$lib/utils";
  import type { ComponentProps } from "svelte";

  interface $$Props extends ComponentProps<"div"> {
    class?: string;
    open?: boolean;
  }

  let { class: className, open = false, ...restProps }: $$Props = $props();
</script>

{#if open}
  <div
    class={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-black/50",
      className
    )}
    {...restProps}
  />
{/if}
