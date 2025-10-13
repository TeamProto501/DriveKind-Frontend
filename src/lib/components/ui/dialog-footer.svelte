<script lang="ts">
  import { cn } from "$lib/utils";
  import type { ComponentProps } from "svelte";

  interface $$Props extends ComponentProps<"div"> {
    class?: string;
  }

  let { class: className, ...restProps }: $$Props = $props();
</script>

<div
  class={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
  {...restProps}
/>
