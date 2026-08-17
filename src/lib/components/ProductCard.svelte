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
    <p class="text-lg text-stone-800 dark:text-gray-100">
      {product.name}
    </p>

    {#if product.condition === 'BRAND NEW'}
      <span class="inline-block bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 px-2 py-1 text-xs font-bold italic text-gray-200">
          {product.condition}
      </span>
      {:else if product.condition === 'NEW - OPEN BOX'}
      <span class="inline-block bg-indigo-500 px-2 py-1 text-xs font-bold italic text-gray-200">
          {product.condition}
      </span>
      {:else if product.condition === 'USED'}
      <span class="inline-block bg-yellow-300 px-2 py-1 text-xs font-bold italic text-gray-800">
          {product.condition}
      </span>
      {:else}
      <span class="inline-block bg-red-500 px-2 py-1 text-xs font-bold italic text-gray-200">
          {product.condition ?? 'UNKNOWN'}
      </span>
    {/if}

    <div class="text-sm text-stone-500 dark:text-gray-300 ">
      by <a class="hover:underline" href={`/sellers/${product.sellerId ?? 'unknown'}`}>{product.sellerName ?? 'Unknown seller'}</a>
    </div>
    

    <div class="flex items-center gap-1 pt-1">
        {#each Array.from({ length: 5 }, (_, idx) => idx) as i (i)}
          <Star
            class={"h-4 w-4 " + (i < filledStars
              ? 'fill-yellow-500 text-yellow-500'
              : 'text-stone-400/50 dark:text-gray-500/50')}
          />
        {/each}
        <span class="ml-1 text-xs text-stone-500 dark:text-gray-300">
          {product.reviewScore ?? 0}
        </span>
        <span class="text-xs text-stone-400 dark:text-gray-400">
          ({product.reviewCount ?? 0})
        </span>
      </div>
  </div>

  <!-- Bottom: Reviews, Price, Items Sold -->
  <div class="mt-2 flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <!-- Price -->
      <span class="text-2xl font-bold text-stone-800 dark:text-gray-100">
        ${product.price}
      </span>
      <span class="mt-2 text-right text-xs text-stone-400 dark:text-stone-400">{product.itemsSold ?? 0} sold</span>
    </div>
  </div>
  <!--Bid count and time left-->
  <div class="flex items-start justify-between text-xs text-stone-500 dark:text-stone-400">
    <a href={`/listings/${product.id}`} class="hover:underline">
      {product.bids ?? 0} bids
    </a>
    <p class="text-stone-500 dark:text-gray-400">·</p>
    {#if product.time_left_hours < 24}
      <a href={"/listings/${product.id}/deadline"} class="hover:underline font-bold text-stone-600 dark:text-stone-300">{product.time_left_hours ?? 0}h left ({product.bid_deadline ?? 'UNKNOWN'})</a>
    {:else}
      <a href={`/listings/${product.id}/deadline`} class="hover:underline text-stone-600 dark:text-stone-300">{product.time_left_days ?? 0}d left ({product.bid_deadline ?? 'UNKNOWN'})</a>
    {/if}
  </div>
</div>