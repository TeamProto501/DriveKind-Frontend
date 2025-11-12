<script lang="ts">
  export let data: any = [];
  
  console.log('=== TABLE COMPONENT LOADED ===');
  console.log('Raw data prop:', data);
  
  $: items = Array.isArray(data) ? data : (data?.data ?? []);
  $: console.log('Items after processing:', items);
  $: console.log('Items length:', items?.length);
</script>

<div class="p-4 bg-yellow-50 border-2 border-yellow-500 rounded">
  <h2 class="text-xl font-bold mb-2">DEBUG TABLE</h2>
  <p>Data type: {typeof data}</p>
  <p>Is array: {Array.isArray(data)}</p>
  <p>Items length: {items?.length || 0}</p>
  
  {#if items?.length > 0}
    <div class="mt-4">
      <p class="font-bold">First item:</p>
      <pre class="bg-white p-2 text-xs overflow-auto">{JSON.stringify(items[0], null, 2)}</pre>
    </div>
  {:else}
    <p class="text-red-600 font-bold">NO ITEMS FOUND</p>
  {/if}
</div>