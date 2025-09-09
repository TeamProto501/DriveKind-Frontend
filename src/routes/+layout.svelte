<script lang="ts">
  let {
    children,
    data,
    roles,
  }: { children: any; data: any; roles: { name: string }[] } = $props();
  import { setContext, onMount } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { supabase } from "$lib/supabase";
  import Navbar from "$lib/components/Navbar.svelte";
  import type { LayoutData } from "./$types";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  setContext("session", data.session);

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

  const sample = {
    roles: [{ name: "Admin" }, { name: "Dispatcher" }],
  };
</script>

<Sidebar.Provider>
  <Navbar {data} roles={sample.roles} />

  {@render children()}
</Sidebar.Provider>
