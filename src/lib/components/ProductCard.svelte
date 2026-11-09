<script lang="ts">
  import { Star, Clock } from 'lucide-svelte';

  interface ListingImage {
    image_url: string;
    is_primary: boolean;
    display_order: number;
  }

  interface Seller {
    username: string;
    rating?: number;
  }

  interface Listing {
    id: string;
    slug: string;
    title: string;
    condition: string;
    starting_price: number;
    current_price: number;
    buy_it_now_price?: number | null;
    end_date: string;
    listing_images?: ListingImage[];
    profiles?: Seller | null;
    bid_count?: number;
    // Legacy dummy props (still supported)
    name?: string;
    image?: string;
    price?: number;
    reviewScore?: number;
    reviewCount?: number;
    itemsSold?: number;
    sellerName?: string;
    bids?: number;
    time_left_hours?: number;
    time_left_days?: number;
    bid_deadline?: string;
  }

  let { product }: { product: Listing } = $props();

  // ── Derived display values ────────────────────────────────────
  let displayTitle = $derived(product.title ?? product.name ?? 'Untitled');
  let displaySlug = $derived(product.slug ?? product.id ?? '#');
  let displayPrice = $derived(product.current_price ?? product.starting_price ?? product.price ?? 0);
  let displaySeller = $derived(
    product.profiles?.username ?? product.sellerName ?? 'Unknown seller'
  );
  let displayRating = $derived(product.profiles?.rating ?? product.reviewScore ?? 0);
  let filledStars = $derived(Math.round(displayRating));
  let displayBids = $derived(product.bid_count ?? product.bids ?? 0);

  // Primary image (4:3)
  let primaryImage = $derived.by(() => {
    const imgs = product.listing_images;
    if (imgs?.length) return (imgs.find((i) => i.is_primary) ?? imgs[0]).image_url;
    return product.image ?? null;
  });

  // Time left
  let timeLeft = $derived.by(() => {
    if (product.end_date) {
      const ms = new Date(product.end_date).getTime() - Date.now();
      if (ms <= 0) return { label: 'Ended', urgent: true };
      const hours = Math.floor(ms / 3_600_000);
      if (hours < 24) return { label: `${hours}h left`, urgent: true };
      const days = Math.floor(hours / 24);
      return { label: `${days}d left`, urgent: false };
    }
    if (product.time_left_hours !== undefined) {
      const h = product.time_left_hours ?? 0;
      return h < 24
        ? { label: `${h}h left`, urgent: true }
        : { label: `${product.time_left_days ?? 0}d left`, urgent: false };
    }
    return null;
  });

  // Condition badge styles
  const CONDITION_STYLES: Record<string, string> = {
    new:      'bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 text-gray-200',
    like_new: 'bg-indigo-500 text-gray-200',
    good:     'bg-yellow-300 text-gray-800',
    fair:     'bg-amber-400 text-gray-800',
    poor:     'bg-red-500 text-gray-200',
    // Legacy dummy values
    'BRAND NEW':      'bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 text-gray-200',
    'NEW - OPEN BOX': 'bg-indigo-500 text-gray-200',
    'USED':           'bg-yellow-300 text-gray-800'
  };

  const CONDITION_LABELS: Record<string, string> = {
    new: 'BRAND NEW',
    like_new: 'LIKE NEW',
    good: 'USED - GOOD',
    fair: 'USED - FAIR',
    poor: 'FOR PARTS / POOR'
  };

  let condStyle = $derived(CONDITION_STYLES[product.condition] ?? 'bg-stone-500 text-gray-200');
  let condLabel = $derived(CONDITION_LABELS[product.condition] ?? product.condition);
</script>

<a
  href={`/listings/${displaySlug}`}
  class="flex flex-col justify-between rounded-2xl border border-white/20 bg-stone-100/40 shadow-lg backdrop-blur-lg transition-transform hover:-translate-y-1 hover:shadow-xl dark:border-gray-700/30 dark:bg-stone-500/20 overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-400"
  aria-label={displayTitle}
>
  <!-- Product Image — enforced 4:3 aspect ratio -->
  <div class="relative w-full aspect-[4/3] overflow-hidden bg-stone-200 dark:bg-stone-700">
    {#if primaryImage}
      <img
        src={primaryImage}
        alt={displayTitle}
        class="h-full w-full object-cover"
        loading="lazy"
      />
    {:else}
      <div class="flex h-full items-center justify-center text-sm text-stone-400 dark:text-stone-500">
        No image
      </div>
    {/if}

    <!-- Condition badge overlay -->
    {#if product.condition}
      <span class="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold italic rounded {condStyle}">
        {condLabel}
      </span>
    {:else}
      <span class="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold italic rounded bg-red-500 text-gray-200">
        UNKNOWN
      </span>
    {/if}
  </div>

  <!-- Product Info -->
  <div class="flex-1 p-4">
    <p class="text-sm font-medium text-stone-800 dark:text-gray-100 line-clamp-2 leading-snug mb-1">
      {displayTitle}
    </p>

    <div class="text-xs text-stone-500 dark:text-gray-400 mb-1.5">
      by <span class="hover:underline">{displaySeller}</span>
    </div>

    <!-- Stars -->
    {#if displayRating > 0}
      <div class="flex items-center gap-0.5 mb-2">
        {#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
          <Star
            class={"h-3 w-3 " + (i < filledStars
              ? 'fill-yellow-500 text-yellow-500'
              : 'text-stone-300/60 dark:text-gray-600/60')}
          />
        {/each}
        <span class="ml-1 text-xs text-stone-500 dark:text-gray-400">{displayRating.toFixed(1)}</span>
      </div>
    {/if}

    <!-- Price + bids/time row -->
    <div class="flex items-end justify-between mt-auto">
      <span class="text-xl font-bold text-stone-800 dark:text-gray-100">
        ₹{displayPrice.toLocaleString('en-IN')}
      </span>
    </div>

    <div class="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mt-1.5">
      <span>{displayBids} bids</span>
      {#if timeLeft}
        <span class="flex items-center gap-1 {timeLeft?.urgent ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}">
          <Clock class="w-3 h-3" />
          {timeLeft?.label}
        </span>
      {/if}
    </div>
  </div>
</a>
