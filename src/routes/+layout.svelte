<script lang="ts">
  import { setContext, onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { supabase } from "$lib/supabase";
  import Navbar from "$lib/components/Navbar.svelte";
  import type { LayoutData } from "./$types";

  // ✅ no type annotation here, just destructure props
  let { children, data } = $props<{ children: any; data: LayoutData }>();

  // Make session available to rest of the app
  setContext("session", data.session);

  onMount(() => {
    console.log("🔍 Layout mounted");
    console.log("SSR-provided session:", data.session);

    // handle async session check
    supabase.auth.getSession().then(({ data: sessionData, error }) => {
      console.log("Client-side session:", sessionData?.session);
      if (error) console.error("Error fetching client session:", error);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("⚡ Auth event:", event);
      console.log("New session:", session);
      invalidateAll();
    });

    // ✅ return cleanup only
    return () => {
      subscription.unsubscribe();
    };
  });
</script>

{#if data.session}
  <Navbar {data}>
    {@render children()}
  </Navbar>
{:else}
  {@render children()}
{/if}


