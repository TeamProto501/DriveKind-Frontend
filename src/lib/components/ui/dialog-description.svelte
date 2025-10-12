<script lang="ts">
  import { cn } from "$lib/utils";
  import type { ComponentProps } from "svelte";

  interface $$Props extends ComponentProps<"p"> {
    class?: string;
  }

  let { class: className, ...restProps }: $$Props = $props();
</script>

<p
  class={cn("text-sm text-muted-foreground", className)}
  {...restProps}
/>
