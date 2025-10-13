<script lang="ts">
  import { cn } from "$lib/utils";
  import type { ComponentProps } from "svelte";

  interface $$Props extends ComponentProps<"h2"> {
    class?: string;
  }

  let { class: className, ...restProps }: $$Props = $props();
</script>

<h2
  class={cn("text-lg font-semibold leading-none tracking-tight", className)}
  {...restProps}
/>
