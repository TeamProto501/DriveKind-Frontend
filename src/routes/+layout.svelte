<script lang="ts">
  let { children, data } = $props();
  import { setContext, onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { supabase } from "$lib/supabase";
  import Navbar from "$lib/components/Navbar.svelte";
  import type { LayoutData } from "./$types";
  setContext("session", data.session);
  setContext("profile", data.profile);
  setContext("roles", data.roles);

  onMount(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      console.log("Auth state change detected");
      invalidateAll();
    });

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
