<script lang="ts">
  import ProductCard from '$lib/components/ProductCard.svelte';
  import { Maximize2, TrendingUp, Clock } from 'lucide-svelte';

  let { data } = $props();

  let featured = $derived((data.featured ?? []));
  let recent = $derived((data.recent ?? []));
</script>

<!-- Featured Listings -->
<div class="mb-5 backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-6 md:p-8">
  <div class="text-stone-800 dark:text-gray-300">
    <div class="mb-4 flex items-center justify-between">
      <a href="/listings" class="text-2xl font-bold hover:underline flex items-center gap-2">
        <TrendingUp class="w-5 h-5 text-indigo-500" />
        Featured Listings
      </a>
      <a href="/listings" class="hidden md:block rounded-full bg-gray-100/40 hover:bg-gray-100/50 p-2 text-stone-800 hover:text-stone-900">
        <Maximize2 class="w-4 h-4" />
      </a>
    </div>
    {#if featured.length === 0}
      <p class="text-center py-8 text-stone-400 dark:text-stone-500">No active listings yet. <a href="/sell" class="text-indigo-500 hover:underline">Be the first to sell!</a></p>
    {:else}
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {#each featured as product (product.id)}
          <ProductCard {product} />
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Recent Listings -->
<div class="mb-5 backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-6 md:p-8">
  <div class="text-stone-800 dark:text-gray-300">
    <div class="mb-4 flex items-center justify-between">
      <a href="/listings" class="text-2xl font-bold hover:underline flex items-center gap-2">
        <Clock class="w-5 h-5 text-rose-500" />
        Recently Listed
      </a>
      <a href="/listings" class="hidden md:block rounded-full bg-gray-100/40 hover:bg-gray-100/50 p-2 text-stone-800 hover:text-stone-900">
        <Maximize2 class="w-4 h-4" />
      </a>
    </div>
    {#if recent.length === 0}
      <p class="text-center py-8 text-stone-400 dark:text-stone-500">Nothing here yet.</p>
    {:else}
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {#each recent as product (product.id)}
          <ProductCard {product} />
        {/each}
      </div>
    {/if}
  </div>
</div>
