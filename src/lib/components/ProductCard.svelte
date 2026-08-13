<script>
  import { Star } from 'lucide-svelte';

  let { product } = $props();
  let filledStars = $derived(Math.round(product.reviewScore ?? 0));
</script>

<div
  class="flex flex-col justify-between rounded-2xl border border-white/20 bg-stone-100/40 p-5 shadow-lg backdrop-blur-lg transition-transform hover:-translate-y-1 hover:shadow-xl dark:border-gray-700/30 dark:bg-stone-500/20"
>
  <!-- Product Image -->
  <div class="relative mb-4 h-40 w-full overflow-hidden rounded-lg bg-stone-200 dark:bg-stone-700">
    {#if product.image}
      <img src={product.image} alt={product.name} class="h-full w-full object-cover" />
    {:else}
      <div class="flex h-full items-center justify-center text-sm text-stone-400 dark:text-stone-500">
        No image
      </div>
    {/if}
  </div>

  <!-- Product Info -->
  <div class="flex-1">
    <h2 class="text-lg font-semibold text-stone-800 dark:text-gray-100">
      {product.name}
    </h2>

    <p class="text-sm text-stone-500 dark:text-gray-400">
      by {product.sellerName ?? 'Unknown seller'}
    </p>

    <p class="mt-2 text-sm text-stone-600 dark:text-gray-400">
      {product.desc}
    </p>
  </div>

  <!-- Bottom: Reviews, Price, Items Sold -->
  <div class="mt-4 flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <!-- Stars & Review Score -->
      <div class="flex items-center gap-1">
        {#each Array.from({ length: 5 }, (_, idx) => idx) as i (i)}
          <Star
            class={"h-4 w-4 " + (i < filledStars
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-stone-400/50 dark:text-gray-500/50')}
          />
        {/each}
        <span class="ml-1 text-xs text-stone-500 dark:text-gray-500">
          {product.reviewScore ?? 0}
        </span>
        <span class="text-xs text-stone-400 dark:text-gray-600">
          ({product.reviewCount ?? 0})
        </span>
      </div>

      <!-- Price -->
      <span class="text-base font-medium text-stone-800 dark:text-gray-100">
        ${product.price}
      </span>
    </div>

    <!-- Items Sold -->
    <div class="text-right text-xs text-stone-400 dark:text-gray-500">
      {product.itemsSold ?? 0} sold
    </div>
  </div>
</div>