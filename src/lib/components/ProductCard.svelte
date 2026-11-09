<script lang="ts">
	import { Star, Clock, ShoppingCart, Gavel, Check } from 'lucide-svelte';
	import { addToCart } from '$lib/cart';
	import { getLocalBids } from '$lib/orders';

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
		slug?: string;
		title?: string;
		condition?: string;
		starting_price?: number;
		current_price?: number;
		buy_it_now_price?: number | null;
		end_date?: string;
		seller_id?: string;
		status?: string;
		listing_images?: ListingImage[];
		profiles?: Seller | Seller[] | null;
		bid_count?: number;
		// Legacy dummy props
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

	let displayTitle = $derived(product.title ?? product.name ?? 'Untitled Product');
	let displaySlug = $derived(product.slug ?? product.id ?? '#');

	let localHighestBid = $derived.by(() => {
		if (typeof window === 'undefined') return 0;
		const bids = getLocalBids().filter((b) => b.listing_id === product.id);
		return bids.reduce((max, b) => Math.max(max, Number(b.amount || 0)), 0);
	});

	let displayPrice = $derived(
		Math.max(
			localHighestBid,
			Number(product.current_price ?? product.starting_price ?? product.price ?? 0)
		)
	);

	let isSold = $derived(product.status === 'sold');

	let displaySeller = $derived.by(() => {
		if (!product.profiles) return product.sellerName ?? 'Unknown seller';
		if (Array.isArray(product.profiles)) {
			return product.profiles[0]?.username ?? product.sellerName ?? 'Unknown seller';
		}
		return product.profiles.username ?? product.sellerName ?? 'Unknown seller';
	});

	let displayRating = $derived.by(() => {
		if (!product.profiles) return product.reviewScore ?? 0;
		if (Array.isArray(product.profiles)) {
			return product.profiles[0]?.rating ?? product.reviewScore ?? 0;
		}
		return product.profiles.rating ?? product.reviewScore ?? 0;
	});

	let filledStars = $derived(Math.round(displayRating));
	let displayBids = $derived(product.bid_count ?? product.bids ?? 0);

	// Primary image (4:3)
	let primaryImage = $derived.by(() => {
		const imgs = product.listing_images;
		if (imgs?.length) return (imgs.find((i) => i.is_primary) ?? imgs[0]).image_url;
		return product.image ?? null;
	});

	// Listing type
	let isAuction = $derived(!!product.starting_price || displayBids > 0);
	let isBuyNow = $derived(!!product.buy_it_now_price);

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
		brand_new: 'bg-linear-to-r from-emerald-500 to-teal-600 text-white',
		new: 'bg-linear-to-r from-emerald-500 to-teal-600 text-white',
		like_new: 'bg-indigo-500 text-white',
		open_box: 'bg-sky-500 text-white',
		used_good: 'bg-amber-500 text-stone-900',
		good: 'bg-amber-500 text-stone-900',
		used_fair: 'bg-orange-500 text-white',
		fair: 'bg-orange-500 text-white',
		for_parts: 'bg-rose-500 text-white',
		poor: 'bg-rose-500 text-white',
		'BRAND NEW': 'bg-linear-to-r from-emerald-500 to-teal-600 text-white',
		'NEW - OPEN BOX': 'bg-sky-500 text-white',
		USED: 'bg-amber-500 text-stone-900'
	};

	const CONDITION_LABELS: Record<string, string> = {
		brand_new: 'BRAND NEW',
		new: 'BRAND NEW',
		like_new: 'LIKE NEW',
		open_box: 'OPEN BOX',
		used_good: 'USED - GOOD',
		good: 'USED - GOOD',
		used_fair: 'USED - FAIR',
		fair: 'USED - FAIR',
		for_parts: 'FOR PARTS',
		poor: 'POOR'
	};

	let condStyle = $derived(CONDITION_STYLES[product.condition ?? ''] ?? 'bg-stone-500 text-white');
	let condLabel = $derived(CONDITION_LABELS[product.condition ?? ''] ?? product.condition ?? 'PRE-OWNED');

	// Add to cart feedback
	let addedToCart = $state(false);
	let cartMsg = $state('');

	async function handleAddToCart(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (!product.buy_it_now_price || isSold) return;

		const res = await addToCart({
			id: product.id,
			title: displayTitle,
			price: product.buy_it_now_price,
			image_url: primaryImage,
			seller_id: product.seller_id,
			seller_username: displaySeller,
			slug: displaySlug
		});

		cartMsg = res.message;
		if (res.success) {
			addedToCart = true;
			setTimeout(() => (addedToCart = false), 2500);
		} else {
			alert(res.message);
		}
	}
</script>

<a
	href={`/product/${displaySlug}`}
	class="group relative flex flex-col justify-between rounded-2xl border border-white/20 bg-stone-100/40 shadow-lg backdrop-blur-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl dark:border-gray-700/30 dark:bg-stone-800/40 overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-400"
	aria-label={displayTitle}
>
	<!-- Product Image — enforced 4:3 aspect ratio -->
	<div class="relative w-full aspect-[4/3] overflow-hidden bg-stone-200 dark:bg-stone-700">
		{#if primaryImage}
			<img
				src={primaryImage}
				alt={displayTitle}
				class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
				loading="lazy"
			/>
		{:else}
			<div class="flex h-full items-center justify-center text-sm text-stone-400 dark:text-stone-500">
				No image
			</div>
		{/if}

		<!-- Condition badge overlay (Top-Left) -->
		{#if isSold}
			<span class="absolute top-2.5 left-2.5 px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full shadow-sm bg-rose-600 text-white uppercase">
				SOLD
			</span>
		{:else}
			<span class="absolute top-2.5 left-2.5 px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full shadow-sm {condStyle}">
				{condLabel}
			</span>
		{/if}

		<!-- Listing Type Badge (Top-Right) -->
		<div class="absolute top-2.5 right-2.5 flex items-center gap-1">
			{#if isSold}
				<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-stone-900/80 text-rose-300 backdrop-blur-sm border border-rose-500/30 shadow-sm">
					Closed
				</span>
			{:else if isBuyNow && isAuction}
				<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-stone-900/80 text-amber-300 backdrop-blur-sm border border-amber-300/30 shadow-sm">
					Auction + BIN
				</span>
			{:else if isAuction}
				<span class="flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-900/80 text-indigo-200 backdrop-blur-sm border border-indigo-400/30 shadow-sm">
					<Gavel class="w-2.5 h-2.5" /> Auction
				</span>
			{:else if isBuyNow}
				<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-900/80 text-emerald-200 backdrop-blur-sm border border-emerald-400/30 shadow-sm">
					Buy Now
				</span>
			{/if}
		</div>
	</div>

	<!-- Product Info -->
	<div class="flex-1 p-4 flex flex-col justify-between">
		<div>
			<h3 class="text-sm font-semibold text-stone-800 dark:text-stone-100 line-clamp-2 leading-snug mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
				{displayTitle}
			</h3>

			<div class="text-xs text-stone-500 dark:text-gray-400 mb-2">
				by <span class="font-medium text-stone-700 dark:text-stone-300 hover:underline">{displaySeller}</span>
			</div>

			<!-- Stars -->
			{#if displayRating > 0}
				<div class="flex items-center gap-0.5 mb-2.5">
					{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
						<Star
							class={'h-3 w-3 ' +
								(i < filledStars
									? 'fill-amber-400 text-amber-400'
									: 'text-stone-300 dark:text-gray-600')}
						/>
					{/each}
					<span class="ml-1 text-xs text-stone-500 dark:text-gray-400">{displayRating.toFixed(1)}</span>
				</div>
			{/if}
		</div>

		<!-- Price & Actions Footer -->
		<div class="mt-3 pt-3 border-t border-stone-200/50 dark:border-stone-700/50 space-y-2">
			<!-- Pricing Row -->
			<div class="flex items-baseline justify-between">
				<div>
					<span class="text-xs text-stone-500 dark:text-stone-400 block">
						{isSold ? 'Final Price' : isAuction ? 'Current Bid' : 'Price'}
					</span>
					<span class="text-lg font-bold text-stone-900 dark:text-stone-50">
						₹{displayPrice.toLocaleString('en-IN')}
					</span>
				</div>

				{#if product.buy_it_now_price && isAuction && !isSold}
					<div class="text-right">
						<span class="text-xs text-stone-500 dark:text-stone-400 block">Buy Now</span>
						<span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
							₹{product.buy_it_now_price.toLocaleString('en-IN')}
						</span>
					</div>
				{/if}
			</div>

			<!-- Sub-info: bids / time left + Add to Cart button -->
			<div class="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
				<div class="flex items-center gap-2">
					{#if isAuction}
						<span class="font-medium">{displayBids} {displayBids === 1 ? 'bid' : 'bids'}</span>
					{/if}
					{#if timeLeft && !isSold}
						<span class="flex items-center gap-1 {timeLeft?.urgent ? 'text-rose-500 font-semibold' : ''}">
							<Clock class="w-3 h-3" />
							{timeLeft?.label}
						</span>
					{/if}
				</div>

				<!-- Add to Cart (for Buy Now items) -->
				{#if product.buy_it_now_price && !isSold}
					<button
						onclick={handleAddToCart}
						class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all {addedToCart
							? 'bg-emerald-600 text-white'
							: 'bg-stone-200/70 dark:bg-stone-700/60 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100'}"
						title="Add to cart"
						aria-label="Add to cart"
					>
						{#if addedToCart}
							<Check class="w-3.5 h-3.5" /> Added
						{:else}
							<ShoppingCart class="w-3.5 h-3.5" /> Cart
						{/if}
					</button>
				{/if}
			</div>
		</div>
	</div>
</a>
