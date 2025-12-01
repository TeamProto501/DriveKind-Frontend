<script lang="ts">
  import "../app.css";
  import { setContext, onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { page } from "$app/stores";
  import { supabase } from "$lib/supabase";
  import Navbar from "$lib/components/Navbar.svelte";
  import type { LayoutData } from "./$types";

  let { children, data } = $props<{ children: any; data: LayoutData }>();

  // Routes that should never show the navbar
  const authRoutes = ['/login', '/forgot-password', '/reset-password'];
  let isAuthRoute = $derived(authRoutes.some(route => $page.url.pathname.startsWith(route)));

  // Make session available to rest of the app
  setContext("session", data.session);
  setContext("profile", data.profile);
  setContext("roles", data.roles);

  onMount(() => {
    console.log("🔍 Layout mounted");
    console.log("SSR-provided session:", data.session);

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

    return () => {
      subscription.unsubscribe();
    };
  });
</script>

{#if data.session && !isAuthRoute}
  <Navbar {data}>
    {@render children()}
  </Navbar>
{:else}
  {@render children()}
{/if}
