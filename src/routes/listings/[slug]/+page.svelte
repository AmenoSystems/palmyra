<script lang="ts">
  import { ArrowLeft, Star, Shield, Clock, Tag, Package, Eye, Gavel, ShoppingBag, Heart } from 'lucide-svelte';
  import { enhance } from '$app/forms';

  let { data, form }: { data: any; form: any } = $props();
  let listing = $derived(data.listing as any);
  let rawProfile = $derived(listing?.profiles as any);
  let profile = $derived(
    Array.isArray(rawProfile) ? rawProfile[0] : rawProfile
  );
  let images = $derived(
    ((listing?.listing_images ?? []) as any[]).sort((a, b) => a.display_order - b.display_order)
  );
  let tags = $derived(((listing?.listing_tags ?? []) as any[]).map(t => t.tag));

  // Gallery state
  let activeIdx = $state(0);
  let activeImage = $derived(images[activeIdx]?.image_url ?? null);

  // Time left
  let timeLeft = $derived(() => {
    if (!listing?.end_date) return { label: 'Active', urgent: false, ended: false };
    const ms = new Date(listing.end_date).getTime() - Date.now();
    if (ms <= 0 || listing.status === 'sold' || listing.status === 'ended') {
      return { label: listing.status === 'sold' ? 'Sold' : 'Auction ended', urgent: true, ended: true };
    }
    const hours = Math.floor(ms / 3_600_000);
    if (hours < 1) {
      const mins = Math.floor(ms / 60_000);
      return { label: `${mins}m left`, urgent: true, ended: false };
    }
    if (hours < 24) return { label: `${hours}h left`, urgent: true, ended: false };
    const days = Math.floor(hours / 24);
    return { label: `${days}d ${hours % 24}h left`, urgent: false, ended: false };
  });

  // Seller avatar
  let sellerAvatar = $derived(() => {
    if (data.sellerAvatarUrl) return data.sellerAvatarUrl;
    const name = profile?.username ?? 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=96`;
  });

  // Condition labels
  const CONDITION_LABELS: Record<string, string> = {
    brand_new: 'Brand New', like_new: 'Like New', open_box: 'Open Box',
    used_good: 'Used – Good', used_fair: 'Used – Fair', for_parts: 'For Parts'
  };
  let condLabel = $derived((listing?.condition && CONDITION_LABELS[listing.condition]) ? CONDITION_LABELS[listing.condition] : (listing?.condition ?? 'Unknown'));

  let bidAmount = $state('');
  let isWatchlisted = $state(false);
  let isBidding = $state(false);
  let isBuying = $state(false);

  let isOwnListing = $derived(data.currentUser?.id === listing?.seller_id);
</script>

<svelte:head>
  <title>{listing?.title ?? 'Listing'} | PALMYRA</title>
</svelte:head>

<!-- Back link -->
<div class="mb-4">
  <a href="/listings" class="inline-flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors min-h-[44px] py-2">
    <ArrowLeft class="w-4 h-4" />
    Back to listings
  </a>
</div>

<!-- Status Message / Alert -->
{#if form?.message}
  <div class="mb-5 p-4 rounded-2xl {form.success ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-800' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800'} text-sm font-medium">
    {form.message}
  </div>
{/if}

<div class="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
  <!-- ── LEFT: Images + Details ──────────────────────────────── -->
  <div class="space-y-5">
    <!-- Hero image — 4:3 -->
    <div class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
      <div class="aspect-[4/3] w-full bg-stone-200 dark:bg-stone-700">
        {#if activeImage}
          <img
            src={activeImage}
            alt={listing.title}
            class="w-full h-full object-cover"
            loading="eager"
          />
        {:else}
          <div class="flex h-full items-center justify-center text-stone-400 dark:text-stone-500">No image</div>
        {/if}
      </div>

      <!-- Thumbnail strip -->
      {#if images.length > 1}
        <div class="flex gap-2 p-3 overflow-x-auto scrollbar-hide">
          {#each images as img, idx (img.id || idx)}
            <button
              onclick={() => activeIdx = idx}
              class="shrink-0 w-16 aspect-[4/3] rounded-lg overflow-hidden border-2 transition-colors cursor-pointer {activeIdx === idx ? 'border-indigo-500 ring-2 ring-indigo-400' : 'border-transparent hover:border-stone-400'}"
              aria-label={`View image ${idx + 1}`}
            >
              <img src={img.image_url} alt={`Image ${idx + 1}`} class="w-full h-full object-cover" loading="lazy" />
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Details card -->
    <div class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-5 md:p-6">
      <h1 class="text-xl md:text-2xl font-bold text-stone-800 dark:text-stone-100 mb-3 leading-tight">
        {listing.title}
      </h1>

      <!-- Meta row -->
      <div class="flex flex-wrap gap-2 mb-4 text-xs">
        <span class="px-2.5 py-1 rounded-full bg-stone-200/60 dark:bg-stone-700/60 text-stone-700 dark:text-stone-300 font-medium">
          {condLabel}
        </span>
        <span class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-200/60 dark:bg-stone-700/60 text-stone-500 dark:text-stone-400">
          <Eye class="w-3.5 h-3.5" /> {listing.views ?? 0} views
        </span>
        <span class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-200/60 dark:bg-stone-700/60 text-stone-500 dark:text-stone-400">
          <Package class="w-3.5 h-3.5" /> Qty: {listing.quantity}
        </span>
      </div>

      <!-- Description -->
      <div class="prose prose-sm dark:prose-invert max-w-none text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed mb-4">
        {listing.description}
      </div>

      <!-- Tags -->
      {#if tags.length > 0}
        <div class="flex flex-wrap gap-1.5 mt-3">
          {#each tags as tag}
            <span class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs">
              <Tag class="w-3 h-3" />{tag}
            </span>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Seller card -->
    <div class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-5">
      <h2 class="text-sm font-semibold text-stone-600 dark:text-stone-400 mb-3 uppercase tracking-wide">Seller</h2>
      <div class="flex items-center gap-3">
        <img src={sellerAvatar()} alt={profile?.username ?? 'Seller'} class="w-12 h-12 rounded-full object-cover" />
        <div>
          <a href="/u/{profile?.username}" class="font-semibold text-stone-800 dark:text-stone-100 hover:underline">
            @{profile?.username ?? 'unknown'}
          </a>
          {#if profile?.rating}
            <div class="flex items-center gap-0.5 mt-0.5">
              {#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
                <Star class="w-3 h-3 {i < Math.round(profile.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-stone-300/60'}" />
              {/each}
              <span class="text-xs text-stone-500 dark:text-stone-400 ml-1">
                {Number(profile.rating).toFixed(1)} ({profile.total_reviews ?? 0} reviews)
              </span>
            </div>
          {/if}
        </div>
        <div class="ml-auto flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
          <Shield class="w-3.5 h-3.5" /> Verified
        </div>
      </div>
    </div>
  </div>

  <!-- ── RIGHT: Bid / Buy panel (sticky on desktop) ─────────── -->
  <div class="lg:sticky lg:top-4 h-fit space-y-4">
    <div class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-5">
      <!-- Price -->
      <div class="mb-4">
        <p class="text-xs text-stone-500 dark:text-stone-400 mb-1">Current bid</p>
        <p class="text-3xl font-bold text-stone-800 dark:text-stone-100">
          ₹{Number(listing.current_price ?? 0).toLocaleString('en-IN')}
        </p>
        {#if listing.buy_it_now_price}
          <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Buy It Now: <strong class="text-stone-700 dark:text-stone-300">₹{Number(listing.buy_it_now_price).toLocaleString('en-IN')}</strong>
          </p>
        {/if}
      </div>

      <!-- Time left -->
      <div class="flex items-center gap-2 mb-4 p-3 rounded-xl {timeLeft().urgent ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-stone-100/60 dark:bg-stone-700/40'}">
        <Clock class="w-4 h-4 {timeLeft().urgent ? 'text-rose-600 dark:text-rose-400' : 'text-stone-500'} shrink-0" />
        <span class="text-sm font-medium {timeLeft().urgent ? 'text-rose-700 dark:text-rose-300' : 'text-stone-700 dark:text-stone-300'}">
          {timeLeft().label}
        </span>
      </div>

      {#if isOwnListing}
        <div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs">
          This is your active listing.
        </div>
      {:else if !timeLeft().ended}
        <!-- Bid Form -->
        <form
          method="POST"
          action="?/placeBid"
          use:enhance={() => {
            isBidding = true;
            return async ({ update }) => {
              await update();
              isBidding = false;
              bidAmount = '';
            };
          }}
          class="mb-3 space-y-3"
        >
          <div>
            <label for="bid-amount" class="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Your bid (₹)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-medium">₹</span>
              <input
                id="bid-amount"
                name="bid_amount"
                type="number"
                min={(Number(listing.current_price) || 0) + 1}
                step="1"
                placeholder={String((Number(listing.current_price) || 0) + 1)}
                bind:value={bidAmount}
                required
                class="w-full pl-7 pr-4 py-3 rounded-xl bg-white/60 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm min-h-[48px]"
              />
            </div>
            <p class="text-xs text-stone-400 mt-1">Min. bid: ₹{((Number(listing.current_price) || 0) + 1).toLocaleString('en-IN')}</p>
          </div>

          <button
            type="submit"
            class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors shadow-lg min-h-[52px] cursor-pointer"
            disabled={!bidAmount || isBidding}
          >
            {#if isBidding}
              <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Placing Bid…
            {:else}
              <Gavel class="w-4 h-4" />
              Place Bid
            {/if}
          </button>
        </form>

        <!-- Buy It Now Form -->
        {#if listing.buy_it_now_price}
          <form
            method="POST"
            action="?/buyNow"
            use:enhance={() => {
              isBuying = true;
              return async ({ update }) => {
                await update();
                isBuying = false;
              };
            }}
          >
            <button
              type="submit"
              disabled={isBuying}
              onclick={(e) => {
                if (!confirm(`Confirm Buy It Now for ₹${Number(listing.buy_it_now_price).toLocaleString('en-IN')}?`)) {
                  e.preventDefault();
                }
              }}
              class="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-800 dark:bg-stone-100 hover:opacity-90 disabled:opacity-50 text-stone-100 dark:text-stone-800 font-semibold text-sm transition-opacity min-h-[48px] cursor-pointer"
            >
              {#if isBuying}
                <span class="inline-block w-4 h-4 border-2 border-stone-400 border-t-stone-800 rounded-full animate-spin"></span>
                Processing…
              {:else}
                <ShoppingBag class="w-4 h-4" />
                Buy It Now · ₹{Number(listing.buy_it_now_price).toLocaleString('en-IN')}
              {/if}
            </button>
          </form>
        {/if}
      {:else}
        <p class="text-center text-stone-500 dark:text-stone-400 text-sm py-2 font-medium">This auction has ended.</p>
      {/if}

      <!-- Watchlist -->
      <button
        onclick={() => isWatchlisted = !isWatchlisted}
        class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-stone-300/50 dark:border-stone-600/50 text-stone-600 dark:text-stone-400 hover:bg-stone-100/40 dark:hover:bg-stone-700/40 text-sm transition-colors mt-3 min-h-[44px] cursor-pointer"
      >
        <Heart class="w-4 h-4 {isWatchlisted ? 'fill-rose-500 text-rose-500' : ''}" />
        {isWatchlisted ? 'Watchlisted' : 'Add to Watchlist'}
      </button>
    </div>

    <!-- Quick info -->
    <div class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-4 text-xs text-stone-600 dark:text-stone-400 space-y-2">
      <div class="flex justify-between">
        <span>Starting price</span>
        <strong class="text-stone-700 dark:text-stone-300">₹{Number(listing.starting_price ?? 0).toLocaleString('en-IN')}</strong>
      </div>
      {#if listing.end_date}
        <div class="flex justify-between">
          <span>Ends</span>
          <strong class="text-stone-700 dark:text-stone-300">{new Date(listing.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
        </div>
      {/if}
      <div class="flex justify-between">
        <span>Quantity</span>
        <strong class="text-stone-700 dark:text-stone-300">{listing.quantity}</strong>
      </div>
    </div>
  </div>
</div>

<!-- Mobile sticky bid bar -->
<div class="lg:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-white/95 dark:bg-stone-900/95 backdrop-blur-lg border-t border-stone-200 dark:border-stone-700 safe-area-inset-bottom">
  <div class="flex gap-2 max-w-xl mx-auto items-center">
    {#if !timeLeft().ended && !isOwnListing}
      <form
        method="POST"
        action="?/placeBid"
        use:enhance={() => {
          isBidding = true;
          return async ({ update }) => {
            await update();
            isBidding = false;
            bidAmount = '';
          };
        }}
        class="flex-1 flex gap-2"
      >
        <div class="flex-1 relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-medium">₹</span>
          <input
            type="number"
            name="bid_amount"
            min={(Number(listing.current_price) || 0) + 1}
            step="1"
            placeholder={String((Number(listing.current_price) || 0) + 1)}
            bind:value={bidAmount}
            required
            class="w-full pl-7 pr-3 py-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300/50 min-h-[48px]"
          />
        </div>
        <button
          type="submit"
          class="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm min-h-[48px] cursor-pointer"
          disabled={!bidAmount || isBidding}
        >
          <Gavel class="w-4 h-4" /> Bid
        </button>
      </form>

      {#if listing.buy_it_now_price}
        <form
          method="POST"
          action="?/buyNow"
          use:enhance={() => {
            isBuying = true;
            return async ({ update }) => {
              await update();
              isBuying = false;
            };
          }}
        >
          <button
            type="submit"
            disabled={isBuying}
            class="px-3 py-3 rounded-xl bg-stone-800 dark:bg-stone-100 text-stone-100 dark:text-stone-800 font-semibold text-xs min-h-[48px] whitespace-nowrap cursor-pointer"
          >
            Buy Now
          </button>
        </form>
      {/if}
    {:else}
      <div class="flex-1 text-center text-stone-500 dark:text-stone-400 text-sm py-3 font-medium">
        {isOwnListing ? 'Your listing' : 'Auction ended'}
      </div>
    {/if}
  </div>
</div>

<!-- Spacer for mobile sticky bar -->
<div class="lg:hidden h-20"></div>

<style>
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  .safe-area-inset-bottom { padding-bottom: env(safe-area-inset-bottom, 12px); }
</style>
