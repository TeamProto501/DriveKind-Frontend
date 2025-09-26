<script lang="ts">
  import RoleGuard from '$lib/components/RoleGuard.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import { User, Mail, Phone, MapPin, Calendar } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';

  let profile: any = null;
  let formData: any = {};
  let editing = false;
  let loading = true;
  let isAdmin = false;
  let userId: string | null = null;
  let userToken: string | null = null;

  async function loadProfile() {
    loading = true;

    // Get current auth user + session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();

    if (authError || !user) {
      console.error("Auth error:", authError);
      loading = false;
      return;
    }

    userId = user.id;
    userToken = session?.access_token;

    try {
      // ✅ fetch from external API instead of $lib/api
      const res = await fetch(`https://your-api-url.com/profiles/${userId}`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      profile = await res.json();

      formData = { ...profile };
      isAdmin = profile.role?.includes("Admin") || false;
    } catch (err) {
      console.error("Failed to load profile:", err);
    }

    loading = false;
  }

  async function saveProfile() {
    try {
      const res = await fetch(`https://your-api-url.com/profiles/${userId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          primary_phone: formData.primary_phone,
          dob: formData.dob,
          home_address: formData.home_address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
          contact_type_pref: formData.contact_type_pref,
          // Only Admins can update roles
          role: isAdmin ? formData.role : profile.role
        })
      });

      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      profile = await res.json();
      editing = false;
    } catch (err) {
      console.error("Save failed:", err);
    }
  }

  function cancelEdit() {
    formData = { ...profile };
    editing = false;
  }

  onMount(() => {
    loadProfile();
  });
</script>


