<script lang="ts">
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Pagination from "$lib/components/ui/pagination/index.js";
  export let data: any = [];
  $: items = Array.isArray(data) ? data : (data?.data ?? []);
  const pageSize = 15;
  let currentPage = 1;
  $: pagedData = items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  $: keys = items[0] ? Object.keys(items[0]) : [];
  const formatLabel = (k: string) =>
    k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  function handlePageChange(page: number) {
    currentPage = page;
  }
</script>
<script lang="ts">
  import { supabase } from '$lib/supabase';
  export let type: string;

  let rows: any[] = [];
  let loading = true;
  let error: string | null = null;

  // fetch data whenever type changes
  $: if (type) {
    loadData(type);
  }

  async function loadData(type: string) {
    loading = true;
    error = null;
    rows = [];

    try {
      if (type === 'clients') {
        const { data, error: err } = await supabase
          .from('clients')
          .select('first_name, last_name, date_of_birth, primary_phone');

        if (err) throw err;
        rows = data ?? [];
      }

      if (type === 'drivers') {
        const { data, error: err } = await supabase
          .from('staff_profiles')
          .select('first_name, last_name, dob, role')
          .contains('role', ['Driver']); // role is an enum[]

        if (err) throw err;
        rows = data ?? [];
      }
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="flex flex-col">
  {#if loading}
    <p class="text-gray-500 p-4">Loading...</p>
  {:else if error}
    <p class="text-red-600 p-4">Error: {error}</p>
  {:else}
    <div class="overflow-x-auto border-1 border-gray-100 rounded-md">
      <table class="min-w-full divide-y-2 divide-gray-200 bg-white text-sm">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-4 py-2 text-gray-900">Name</th>
            <th class="px-4 py-2 text-gray-900">DOB</th>
            <th class="px-4 py-2 text-gray-900">Role / Phone</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each rows as row}
            <tr>
              <td class="px-4 py-2 text-gray-900">
                {row.first_name} {row.last_name}
              </td>
              <td class="px-4 py-2 text-gray-700">
                {row.dob || row.date_of_birth}
              </td>
              <td class="px-4 py-2 text-gray-700">
                {#if type === 'drivers'}
                  {row.role?.join(', ')}
                {:else}
                  {row.primary_phone}
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>



