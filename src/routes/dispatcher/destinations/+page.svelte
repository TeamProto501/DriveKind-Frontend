<script lang="ts">
  import {
    Building2,
    Search,
    MapPin,
    Plus,
    Pencil,
    Trash2,
    X,
  } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { supabase } from "$lib/supabase";
  import { invalidate } from "$app/navigation";
  import { invalidateAll } from "$app/navigation";

  // shadcn/ui
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Input } from "$lib/components/ui/input/index.js";

  // ---- Page data from load() (roles, etc.) ----
  interface PageData {
    session?: { user: any } | null;
    profile?: any | null;
    roles?: string[] | null;
    destinations?: Destination[]; // added so data.destinations is typed
    error?: string | null;
  }

  // Table shape
  interface Destination {
    destination_id: number;
    created_at: string | null;
    address: string | null;
    address2: string | null;
    city: string | null;
    state: string | null;
    zipcode: string | null;
    location_name: string | null;
    org_id: number | null; // used only for filtering/guarding
  }

  // Runes: use $props()
  let { data }: { data?: PageData } = $props();

  // ---- Role handling (runes) ----
  let userRoles = $state<string[]>([]);
  function hasRole(required: string[]): boolean {
    return required.some((r) => userRoles.includes(r));
  }
  $effect(() => {
    userRoles = Array.isArray(data?.roles) ? (data!.roles as string[]) : [];
  });
  let canManage = $derived(hasRole(["Admin", "Super Admin"]));

  let destinations = $state<Destination[]>(data?.destinations || []);
  let isLoading = $state(false);
  let searchTerm = $state("");

  // Reactively update destinations when data changes
  $effect(() => {
    if (data?.destinations) {
      destinations = data.destinations;
    }
    if (data?.session?.user?.id) {
      viewerUid = data.session.user.id;
    }
    if (data?.profile?.org_id !== undefined) {
      viewerOrgId = data.profile.org_id;
    }
  });

  // viewer identity
  let viewerUid: string | null = $state(data?.session?.user?.id || null);
  let viewerOrgId: number | null = $state(data?.profile?.org_id || null);

  // toast - now with fixed positioning above modal
  let toast = $state("");
  let toastOk = $state(true);
  function setToast(message: string, ok = true) {
    toast = message;
    toastOk = ok;
    setTimeout(() => (toast = ""), 6000); // Increased to 6s for readability
  }

  // CREATE / EDIT modal state (only rendered if canManage)
  let showUpsertModal = $state(false);
  let isSaving = $state(false);
  let upsertMode = $state<"create" | "edit">("create");
  let form = $state({
    destination_id: null as number | null, // never sent on create
    location_name: "" as string,
    address: "" as string,
    address2: "" as string,
    city: "" as string,
    state: "" as string,
    zipcode: "" as string,
  });

  // Inline validation errors
  // location_name removed – it is optional now
  let formErrors = $state({
    address: "",
    city: "",
    state: "",
  });

  // DELETE modal state (only rendered if canManage)
  let showDeleteModal = $state(false);
  let isDeleting = $state(false);
  let toDelete = $state<Destination | null>(null);

  onMount(async () => {
    try {
      // Use server-loaded data
      if (data?.session?.user?.id) {
        viewerUid = data.session.user.id;
      }
      if (data?.profile?.org_id) {
        viewerOrgId = data.profile.org_id;
      }

      // If server data is available, use it
      if (data?.destinations) {
        destinations = data.destinations;
        isLoading = false;
        return;
      }

      // Fallback: load org if not in server data
      if (!viewerOrgId) {
        await loadViewerOrg();
        if (!viewerOrgId) {
          setToast(
            "Your staff profile is not linked to an organization.",
            false
          );
          isLoading = false;
          return;
        }
      }
      await loadDestinations();
    } catch (e: any) {
      console.error("Init error:", e?.message ?? e);
      setToast("Initialization failed.", false);
      isLoading = false;
    }
  });

  // Friendly datetime
  function formatDate(ts: string | null): string {
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  }

  // ---- Viewer org lookup ----
  async function loadViewerOrg() {
    viewerUid = data?.session?.user?.id ?? null;
    if (!viewerUid) {
      const { data: auth, error } = await supabase.auth.getUser();
      if (error) throw error;
      viewerUid = auth?.user?.id ?? null;
    }
    if (!viewerUid) throw new Error("No user session.");

    const { data: sp, error: spErr } = await supabase
      .from("staff_profiles")
      .select("org_id")
      .eq("user_id", viewerUid)
      .single();

    if (spErr) throw spErr;
    viewerOrgId = (sp?.org_id ?? null) as number | null;
  }

  // Load (filter by org) - now uses server data, but can refresh if needed
  async function loadDestinations() {
    try {
      isLoading = true;

      if (!viewerOrgId) {
        destinations = [];
        isLoading = false;
        return;
      }

      // Invalidate the page to reload data from server
      await invalidate("/dispatcher/destinations");
      // Also invalidate all to ensure everything refreshes
      await invalidateAll();
    } catch (e: any) {
      console.error("Load error:", e?.message ?? e);
      setToast("Error loading destinations.", false);
      destinations = [];
    } finally {
      isLoading = false;
    }
  }

  // ------- Add / Edit (guarded) -------
  function resetForm() {
    form = {
      destination_id: null,
      location_name: "",
      address: "",
      address2: "",
      city: "",
      state: "",
      zipcode: "",
    };
    formErrors = {
      address: "",
      city: "",
      state: "",
    };
  }

  function validateForm(): boolean {
    let isValid = true;
    formErrors = {
      address: "",
      city: "",
      state: "",
    };

    // location_name is OPTIONAL now – skip validation

    if (!form.address.trim()) {
      formErrors.address = "Street address is required";
      isValid = false;
    }

    if (!form.city.trim()) {
      formErrors.city = "City is required";
      isValid = false;
    }

    if (!form.state.trim()) {
      formErrors.state = "State is required";
      isValid = false;
    }

    return isValid;
  }

  function openCreateModal() {
    if (!canManage) return;
    upsertMode = "create";
    resetForm();
    showUpsertModal = true;
  }

  function openEditModal(row: Destination) {
    if (!canManage) return;
    upsertMode = "edit";
    form = {
      destination_id: row.destination_id,
      location_name: row.location_name ?? "",
      address: row.address ?? "",
      address2: row.address2 ?? "",
      city: row.city ?? "",
      state: row.state ?? "",
      zipcode: row.zipcode ?? "",
    };
    formErrors = {
      address: "",
      city: "",
      state: "",
    };
    showUpsertModal = true;
  }

  async function saveDestination() {
    if (!canManage) {
      setToast("You do not have permission to modify destinations.", false);
      return;
    }
    if (!viewerOrgId) {
      setToast("No organization found for your account.", false);
      return;
    }

    // Validate form
    if (!validateForm()) {
      setToast("Please fix the errors in the form below.", false);
      return;
    }

    isSaving = true;
    try {
      if (upsertMode === "create") {
        const payload = {
          // if blank, send null
          location_name: form.location_name.trim() || null,
          address: form.address.trim(),
          address2: form.address2?.trim() || null,
          city: form.city.trim(),
          state: form.state.trim(),
          zipcode: form.zipcode?.trim() || null,
          org_id: viewerOrgId,
        };

        const res = await fetch("/dispatcher/destinations/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || "Failed to create destination");
        }

        setToast("Destination created successfully!", true);
      } else {
        if (!form.destination_id)
          return setToast("Missing destination_id for update.", false);

        const payload = {
          location_name: form.location_name.trim() || null,
          address: form.address.trim(),
          address2: form.address2?.trim() || null,
          city: form.city.trim(),
          state: form.state.trim(),
          zipcode: form.zipcode?.trim() || null,
        };

        const res = await fetch(
          `/dispatcher/destinations/update/${form.destination_id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || "Failed to update destination");
        }

        setToast("Destination updated successfully!", true);
      }

      showUpsertModal = false;
      await loadDestinations();
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("Save error:", msg);
      if (msg.includes("duplicate key") || msg.includes("23505")) {
        setToast(
          "Primary key collision. If you recently imported/deleted data, RESTART identity to MAX(id)+1.",
          false
        );
      } else {
        setToast(msg || "Failed to save destination.", false);
      }
    } finally {
      isSaving = false;
    }
  }

  // ------- Delete (guarded) -------
  function openDeleteModal(row: Destination) {
    if (!canManage) return;
    toDelete = row;
    showDeleteModal = true;
  }

  async function confirmDelete() {
    if (!canManage) {
      setToast("You do not have permission to delete destinations.", false);
      return;
    }
    if (!toDelete || !viewerOrgId) return;

    isDeleting = true;
    try {
      const res = await fetch(
        `/dispatcher/destinations/delete/${toDelete.destination_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to delete destination");
      }

      setToast("Destination deleted successfully!", true);
      showDeleteModal = false;
      toDelete = null;
      await loadDestinations();
    } catch (err: any) {
      console.error("Delete error:", err?.message ?? err);
      setToast(err?.message ?? "Failed to delete destination.", false);
    } finally {
      isDeleting = false;
    }
  }

  // ------- FILTER (runes) -------
  let filteredDestinations = $derived(
    !destinations?.length
      ? []
      : !searchTerm.trim()
        ? destinations
        : destinations.filter((d) => {
            const q = searchTerm.toLowerCase();
            return (
              String(d.location_name ?? "")
                .toLowerCase()
                .includes(q) ||
              String(d.city ?? "")
                .toLowerCase()
                .includes(q) ||
              String(d.state ?? "")
                .toLowerCase()
                .includes(q) ||
              String(d.zipcode ?? "")
                .toLowerCase()
                .includes(q) ||
              String(d.address ?? "")
                .toLowerCase()
                .includes(q) ||
              String(d.address2 ?? "")
                .toLowerCase()
                .includes(q)
            );
          })
  );
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Toast - Fixed position at top, above modals -->
  {#if toast}
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-2xl w-full px-4">
      <div
        class={toastOk
          ? "rounded-lg p-4 bg-green-50 border-2 border-green-200 shadow-lg"
          : "rounded-lg p-4 bg-red-50 border-2 border-red-200 shadow-lg"}
      >
        <div class="flex items-start gap-3">
          <p class={toastOk ? "text-sm text-green-800 flex-1" : "text-sm text-red-800 flex-1"}>
            {toast}
          </p>
          <button
            onclick={() => (toast = "")}
            class={toastOk
              ? "text-green-600 hover:text-green-800"
              : "text-red-600 hover:text-red-800"}
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Header -->
  <div class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-blue-100 rounded-lg">
            <Building2 class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Destinations</h1>
            <p class="text-sm text-gray-600">
              View {canManage ? "and manage " : ""}destinations in your org
            </p>
          </div>
        </div>

        {#if canManage}
          <Button onclick={openCreateModal} class="flex items-center gap-2">
            <Plus class="w-4 h-4" />
            <span>Add Destination</span>
          </Button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Main -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <!-- Search -->
    <div class="mb-6">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div class="flex items-center space-x-4">
          <div class="flex-1 max-w-md">
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"
              />
              <input
                type="text"
                placeholder="Search destinations..."
                bind:value={searchTerm}
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div class="text-sm text-gray-500">
            {filteredDestinations.length} destination{filteredDestinations.length !==
            1
              ? "s"
              : ""} found
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      {#if isLoading}
        <div class="p-8 text-center">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"
          ></div>
          <p class="mt-2 text-gray-500">Loading destinations...</p>
        </div>
      {:else if filteredDestinations.length === 0}
        <div class="p-8 text-center">
          <MapPin class="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? "No destinations found" : "No destinations yet"}
          </h3>
          <p class="text-gray-500 mb-4">
            {searchTerm
              ? "Try adjusting your search terms."
              : "No destinations available."}
          </p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >Destination</th
                >
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >Address</th
                >
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >Location</th
                >
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >Created At</th
                >
                {#if canManage}
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >Actions</th
                  >
                {/if}
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each filteredDestinations as dest (dest.destination_id)}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div class="text-sm font-medium text-gray-900">
                        {dest.location_name ?? "—"}
                      </div>
                      <div class="text-sm text-gray-500">
                        ID: {dest.destination_id}
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {dest.address ?? ""}{dest.address2
                        ? `, ${dest.address2}`
                        : ""}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center space-x-2">
                      <MapPin class="w-4 h-4 text-gray-400" />
                      <div>
                        <div class="text-sm text-gray-900">
                          {dest.city ?? ""}, {dest.state ?? ""}
                        </div>
                        <div class="text-sm text-gray-500">
                          {dest.zipcode ?? ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {formatDate(dest.created_at)}
                  </td>
                  {#if canManage}
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          class="flex items-center gap-1"
                          onclick={() => openEditModal(dest)}
                        >
                          <Pencil class="w-4 h-4" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          class="flex items-center gap-1"
                          onclick={() => openDeleteModal(dest)}
                        >
                          <Trash2 class="w-4 h-4" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </td>
                  {/if}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>

  <!-- Modals only mount if user can manage -->
  {#if canManage}
    <!-- Create / Edit Modal -->
    <Dialog.Root bind:open={showUpsertModal}>
      <Dialog.Content class="sm:max-w-lg bg-white max-h-[90vh] overflow-y-auto">
        <Dialog.Header>
          <Dialog.Title
            >{upsertMode === "create"
              ? "Add Destination"
              : "Edit Destination"}</Dialog.Title
          >
          <Dialog.Description>
            {upsertMode === "create"
              ? "Create a new destination entry. Fields marked with * are required."
              : `Update details for destination ID ${form.destination_id}.`}
          </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4">
          <!-- Location name is OPTIONAL now -->
          <div class="space-y-2">
            <Label for="location_name">Location Name</Label>
            <Input
              id="location_name"
              bind:value={form.location_name}
              placeholder="e.g., Jefferson Medical Plaza"
            />
            <p class="text-xs text-gray-500">
              Optional. Leave blank if this destination has no special name.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="address">Address *</Label>
              <Input
                id="address"
                bind:value={form.address}
                placeholder="123 Main St"
                class={formErrors.address ? "border-red-500" : ""}
              />
              {#if formErrors.address}
                <p class="text-sm text-red-600">{formErrors.address}</p>
              {/if}
            </div>
            <div class="space-y-2">
              <Label for="address2">Address 2</Label>
              <Input
                id="address2"
                bind:value={form.address2}
                placeholder="Suite / Floor (optional)"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-2">
              <Label for="city">City *</Label>
              <Input
                id="city"
                bind:value={form.city}
                placeholder="City"
                class={formErrors.city ? "border-red-500" : ""}
              />
              {#if formErrors.city}
                <p class="text-sm text-red-600">{formErrors.city}</p>
              {/if}
            </div>
            <div class="space-y-2">
              <Label for="state">State *</Label>
              <Input
                id="state"
                bind:value={form.state}
                placeholder="NY"
                class={formErrors.state ? "border-red-500" : ""}
              />
              {#if formErrors.state}
                <p class="text-sm text-red-600">{formErrors.state}</p>
              {/if}
            </div>
            <div class="space-y-2">
              <Label for="zipcode">Zipcode</Label>
              <Input
                id="zipcode"
                bind:value={form.zipcode}
                placeholder="14604"
              />
            </div>
          </div>
        </div>

        <Dialog.Footer class="mt-6">
          <Button
            variant="outline"
            onclick={() => (showUpsertModal = false)}
            disabled={isSaving}>Cancel</Button
          >
          <Button onclick={saveDestination} disabled={isSaving}>
            {isSaving
              ? "Saving…"
              : upsertMode === "create"
                ? "Create"
                : "Save Changes"}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>

    <!-- Delete Modal -->
    <Dialog.Root bind:open={showDeleteModal}>
      <Dialog.Content class="sm:max-w-md bg-white">
        <Dialog.Header>
          <Dialog.Title>Delete Destination</Dialog.Title>
          <Dialog.Description>This action cannot be undone.</Dialog.Description>
        </Dialog.Header>

        <div
          class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800"
        >
          Delete <span class="font-medium"
            >{toDelete?.location_name ?? "—"}</span
          >
          (ID: {toDelete?.destination_id})?
        </div>

        <Dialog.Footer class="mt-6">
          <Button
            variant="outline"
            onclick={() => (showDeleteModal = false)}
            disabled={isDeleting}>Cancel</Button
          >
          <Button
            class="bg-red-600 text-white"
            onclick={confirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  {/if}
</div>