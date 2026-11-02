<script>
  import ProductCard from '$lib/components/ProductCard.svelte';
  import { Search, SlidersHorizontal } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let { data } = $props();

  let searchValue = $state(data.search ?? '');
  let sortValue = $state(data.sort ?? 'recent');

  const SORT_OPTIONS = [
    { value: 'recent',      label: 'Most Recent' },
    { value: 'ending_soon', label: 'Ending Soon' },
    { value: 'price_asc',   label: 'Price: Low → High' },
    { value: 'price_desc',  label: 'Price: High → Low' }
  ];

  function applyFilters(p = 1) {
    const params = new URLSearchParams();
    if (searchValue) params.set('q', searchValue);
    if (sortValue !== 'recent') params.set('sort', sortValue);
    if (p > 1) params.set('page', String(p));
    goto(`/listings?${params.toString()}`, { replaceState: true });
  }

  function handleSearch(e: Event) {
    e.preventDefault();
    applyFilters(1);
  }

  let totalPages = $derived(Math.ceil(data.count / data.pageSize));
</script>

<svelte:head>
  <title>Browse Listings | PALMYRA</title>
</svelte:head>

<div class="mb-5 backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-5 md:p-8">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
    <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100 flex-1">Browse Listings</h1>
    <span class="text-sm text-stone-500 dark:text-stone-400">{data.count} items</span>
  </div>

  <!-- Search + Sort -->
  <form onsubmit={handleSearch} class="flex flex-col sm:flex-row gap-3 mb-6">
    <div class="relative flex-1">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
      <input
        type="text"
        placeholder="Search listings…"
        bind:value={searchValue}
        class="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm min-h-[48px]"
      />
    </div>
    <div class="flex gap-2">
      <div class="relative">
        <SlidersHorizontal class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        <select
          bind:value={sortValue}
          onchange={() => applyFilters(1)}
          class="pl-10 pr-8 py-3 rounded-xl bg-white/50 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm min-h-[48px] appearance-none"
        >
          {#each SORT_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
      <button type="submit" class="px-4 py-3 rounded-xl bg-stone-800 dark:bg-stone-100 text-stone-100 dark:text-stone-800 font-medium text-sm min-h-[48px] hover:opacity-90 transition-opacity">
        Search
      </button>
    </div>
  </form>

  <!-- Grid -->
  {#if data.listings.length === 0}
    <div class="text-center py-16 text-stone-400 dark:text-stone-500">
      <p class="text-lg mb-2">No listings found</p>
      <p class="text-sm">Try a different search or <a href="/sell" class="text-indigo-500 hover:underline">create a listing</a>.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each data.listings as product (product.id)}
        <ProductCard {product} />
      {/each}
    </div>
  {/if}

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="flex items-center justify-center gap-2 mt-8">
      {#if data.page > 1}
        <button
          onclick={() => applyFilters(data.page - 1)}
          class="px-4 py-2.5 rounded-xl bg-stone-200/60 dark:bg-stone-700/40 text-stone-700 dark:text-stone-300 text-sm min-h-[44px]"
        >← Prev</button>
      {/if}
      <span class="text-sm text-stone-500 dark:text-stone-400">Page {data.page} of {totalPages}</span>
      {#if data.page < totalPages}
        <button
          onclick={() => applyFilters(data.page + 1)}
          class="px-4 py-2.5 rounded-xl bg-stone-200/60 dark:bg-stone-700/40 text-stone-700 dark:text-stone-300 text-sm min-h-[44px]"
        >Next →</button>
      {/if}
    </div>
  {/if}
</div>
