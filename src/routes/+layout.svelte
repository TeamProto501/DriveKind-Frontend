<script lang="ts">
  import type { RoleEnum } from "$lib/types";
  let {
    children,
    data,
    roles,
  }: { children: any; data: any; roles: { name: RoleEnum }[] } = $props();
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
  const userRoles: RoleEnum[] = sample.roles.map((r) => r.name as RoleEnum);
</script>

<Sidebar.Provider>
  <Navbar {data} roles={[{ name: "Admin" }, { name: "Dispatcher" }]} />

  {@render children()}
</Sidebar.Provider>
