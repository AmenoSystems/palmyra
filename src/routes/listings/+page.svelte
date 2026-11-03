<script lang="ts">
  import ProductCard from '$lib/components/ProductCard.svelte';
  import { Search, SlidersHorizontal, X } from 'lucide-svelte';
  import { goto } from '$app/navigation';

  let { data } = $props();

  let searchValue = $state('');
  let sortValue = $state('recent');

  $effect(() => {
    searchValue = data.search ?? '';
    sortValue = data.sort ?? 'recent';
  });

  const SORT_OPTIONS = [
    { value: 'recent',      label: 'Most Recent' },
    { value: 'ending_soon', label: 'Ending Soon' },
    { value: 'price_asc',   label: 'Price: Low → High' },
    { value: 'price_desc',  label: 'Price: High → Low' }
  ];

  let categorySlug = $derived((data as any).categorySlug ?? '');

  function applyFilters(p = 1) {
    const params = new URLSearchParams();
    if (searchValue) params.set('q', searchValue);
    if (categorySlug) params.set('category', categorySlug);
    if (sortValue !== 'recent') params.set('sort', sortValue);
    if (p > 1) params.set('page', String(p));
    goto(`/listings?${params.toString()}`, { replaceState: true });
  }

  function handleSearch(e: Event) {
    e.preventDefault();
    applyFilters(1);
  }

  function clearCategory() {
    const params = new URLSearchParams();
    if (searchValue) params.set('q', searchValue);
    if (sortValue !== 'recent') params.set('sort', sortValue);
    goto(`/listings?${params.toString()}`, { replaceState: true });
  }

  let totalPages = $derived(Math.ceil((data.count ?? 0) / (data.pageSize || 20)));
  let listings = $derived((data.listings ?? []) as any[]);
</script>

<svelte:head>
  <title>Browse Listings | PALMYRA</title>
</svelte:head>

<div class="mb-5 backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-5 md:p-8">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
    <div class="flex-1">
      <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">Browse Listings</h1>
      {#if categorySlug}
        <div class="flex items-center gap-2 mt-1">
          <span class="text-xs text-stone-500 dark:text-stone-400">Filtering category:</span>
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
            {categorySlug}
            <button onclick={clearCategory} class="hover:text-red-500 p-0.5 cursor-pointer" aria-label="Clear category filter">
              <X class="w-3 h-3" />
            </button>
          </span>
        </div>
      {/if}
    </div>
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
          class="pl-10 pr-8 py-3 rounded-xl bg-white/50 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm min-h-[48px] appearance-none cursor-pointer"
        >
          {#each SORT_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
      <button type="submit" class="px-5 py-3 rounded-xl bg-stone-800 dark:bg-stone-100 text-stone-100 dark:text-stone-800 font-medium text-sm min-h-[48px] hover:opacity-90 transition-opacity cursor-pointer">
        Search
      </button>
    </div>
  </form>

  <!-- Grid -->
  {#if listings.length === 0}
    <div class="text-center py-16 text-stone-400 dark:text-stone-500">
      <p class="text-lg mb-2">No listings found</p>
      <p class="text-sm">Try a different search or <a href="/sell" class="text-indigo-500 hover:underline">create a listing</a>.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each listings as product (product.id)}
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
          class="px-4 py-2.5 rounded-xl bg-stone-200/60 dark:bg-stone-700/40 text-stone-700 dark:text-stone-300 text-sm min-h-[44px] cursor-pointer"
        >← Prev</button>
      {/if}
      <span class="text-sm text-stone-500 dark:text-stone-400">Page {data.page} of {totalPages}</span>
      {#if data.page < totalPages}
        <button
          onclick={() => applyFilters(data.page + 1)}
          class="px-4 py-2.5 rounded-xl bg-stone-200/60 dark:bg-stone-700/40 text-stone-700 dark:text-stone-300 text-sm min-h-[44px] cursor-pointer"
        >Next →</button>
      {/if}
    </div>
  {/if}
</div>
