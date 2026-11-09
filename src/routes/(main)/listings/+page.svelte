<script lang="ts">
  import ProductCard from '$lib/components/ProductCard.svelte';
  import { X, SlidersHorizontal } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { SvelteURLSearchParams } from 'svelte/reactivity';

  let { data } = $props();

  let searchValue = $state('');
  let sortValue = $state('recent');
  let showFilters = $state(false);

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
  
  const CONDITIONS = [
    { value: 'new', label: 'Brand new' },
    { value: 'like_new', label: 'Like new' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor / for parts' }
  ];

  // let activeFilterCount = $derived(
  //   (data.search ? 1 : 0) +
  //     data.conditions.length +
  //     (data.min != null ? 1 : 0) +
  //     (data.max != null ? 1 : 0)
  // );

  let activeFilterCount = $state(0);

  function pageHref(p: number) {
    const params = new SvelteURLSearchParams();
    if (searchValue) params.set('q', searchValue);
    if (sortValue !== 'recent') params.set('sort', sortValue);
    if (p > 1) params.set('page', String(p));
    else params.delete('page');
    return `/listings?${params.toString()}`;
  }

  let totalPages = $derived(Math.ceil((data.count ?? 0) / (data.pageSize || 20)));
  let listings = $derived((data.listings ?? []) as any[]);

  const card = 'backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-5 md:p-8';

  const input =
    'w-full rounded-xl border border-stone-300/50 bg-white/50 px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 dark:border-stone-600/50 dark:bg-stone-700/40 dark:text-stone-50';
  const label = 'mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400';
</script>

<svelte:head>
  <title>Browse Listings | PALMYRA</title>
</svelte:head>

<div class="grid gap-6 lg:grid-cols-[17rem_1fr] lg:items-start">
  <!-- Mobile toggle -->
  <button
    type="button"
    onclick={() => (showFilters = !showFilters)}
    class="{card} flex items-center justify-between px-5 py-3 text-sm font-medium text-stone-800 lg:hidden dark:text-stone-100"
    aria-expanded={showFilters}
  >
    <span class="flex items-center gap-2">
      <SlidersHorizontal class="h-4 w-4" /> Filters
      {#if activeFilterCount}<span class="rounded-full bg-indigo-600 px-2 text-xs text-white">{activeFilterCount}</span>{/if}
    </span>
    <span class="text-xs text-stone-500">{showFilters ? 'Hide' : 'Show'}</span>
  </button>

  <aside class="{card} p-5 lg:sticky lg:top-4 {showFilters ? 'block' : 'hidden'} lg:block">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-stone-800 dark:text-stone-100">Filters</h2>
      {#if activeFilterCount}
        <a href="/listings" class="flex items-center gap-1 text-xs text-indigo-500 hover:underline">
          <X class="h-3 w-3" /> Clear all
        </a>
      {/if}
    </div>

    <!-- GET form: values go into the URL, the server load reads them -->
    <form
      method="GET"
      action="/listings"
      data-sveltekit-keepfocus
      data-sveltekit-noscroll
      onchange={(e) => e.currentTarget.requestSubmit()}
      class="space-y-5"
    >

      <div>
        <label class={label} for="sort">Sort by</label>
        <select id="sort" name="sort" class={input}>
          {#each SORT_OPTIONS as opt (opt.value)}
            <option value={opt.value} selected={data.sort === opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>

      <fieldset>
        <legend class={label}>Condition</legend>
        <div class="space-y-1.5">
          {#each CONDITIONS as c (c.value)}
            <label class="flex cursor-pointer items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
              <input
                type="checkbox"
                name="condition"
                value={c.value}
                checked={true}
                class="h-4 w-4 rounded accent-indigo-600"
              />
              {c.label}
            </label>
          {/each}
        </div>
      </fieldset>

      <fieldset>
        <legend class={label}>Price (₹)</legend>
        <div class="flex items-center gap-2">
          <input name="min" type="number" min="0" inputmode="numeric" placeholder="Min" value={data.min ?? ''} class={input} />
          <span class="text-stone-400">–</span>
          <input name="max" type="number" min="0" inputmode="numeric" placeholder="Max" value={data.max ?? ''} class={input} />
        </div>
      </fieldset>

      {#if data.category}<input type="hidden" name="category" value={data.category} />{/if}

      <!-- Works without JS, and for text/number inputs where "change" only fires on blur -->
      <button
        type="submit"
        class="w-full rounded-xl bg-stone-800 py-2.5 text-sm font-medium text-stone-100 hover:opacity-90 dark:bg-stone-100 dark:text-stone-800"
      >
        Apply
      </button>
    </form>
  </aside>

  <section class="{card} min-w-0 p-5 md:p-8">
   <div class="flex items-center gap-3 mb-5">
      <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100 flex-1">Browse Listings</h1>
      <span class="text-sm text-stone-500 dark:text-stone-400">{data.count} items</span>
    </div>

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
      <nav class="mt-8 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
        {#if data.page > 1}
          <a href={pageHref(data.page - 1)} class="rounded-xl bg-stone-200/60 px-4 py-2.5 text-stone-700 dark:bg-stone-700/40 dark:text-stone-300">← Prev</a>
        {/if}
        <span class="text-stone-500 dark:text-stone-400">Page {data.page} of {totalPages}</span>
        {#if data.page < totalPages}
          <a href={pageHref(data.page + 1)} class="rounded-xl bg-stone-200/60 px-4 py-2.5 text-stone-700 dark:bg-stone-700/40 dark:text-stone-300">Next →</a>
        {/if}
      </nav>
    {/if}
  </section>
</div>
