<script lang="ts">
  import { cn } from "$lib/utils";
  import type { ComponentProps } from "svelte";

  interface $$Props extends ComponentProps<"div"> {
    class?: string;
  }

  let { class: className, ...restProps }: $$Props = $props();
</script>

<div
  class={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
  {...restProps}
/>
