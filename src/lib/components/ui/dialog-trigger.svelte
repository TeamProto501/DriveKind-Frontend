<script lang="ts">
  import { cn } from "$lib/utils";
  import type { ComponentProps } from "svelte";

  interface $$Props extends ComponentProps<"button"> {
    class?: string;
  }

  let { class: className, ...restProps }: $$Props = $props();
</script>

<button
  class={cn("", className)}
  {...restProps}
/>
