<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		ArrowLeft,
		Star,
		Clock,
		Eye,
		Gavel,
		ShoppingBag,
		ShoppingCart,
		Heart,
		Share2,
		UserPlus,
		UserCheck,
		Check,
		CheckCircle2,
		AlertCircle,
		ShieldCheck,
		Package,
		ExternalLink
	} from 'lucide-svelte';
	import { supabase } from '$lib/supabaseClient';
	import { addToCart } from '$lib/cart';
	import { addLocalOrder, addLocalBid } from '$lib/orders';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let listing = $derived(data.listing as any);
	let rawProfile = $derived(listing?.profiles as any);
	let profile = $derived(Array.isArray(rawProfile) ? rawProfile[0] : rawProfile);
	let images = $derived(
		((listing?.listing_images ?? []) as any[]).sort(
			(a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
		)
	);

	// Gallery state
	let activeIdx = $state(0);
	let activeImage = $derived(images[activeIdx]?.image_url ?? null);

	// Realtime bids & prices
	let currentPrice = $state(0);
	let bids = $state<any[]>([]);
	let bidCount = $state(0);

	$effect(() => {
		currentPrice = Number(data.listing?.current_price ?? data.listing?.starting_price ?? 0);
		bids = (data.bids ?? []) as any[];
		bidCount = data.bidCount ?? 0;
	});

	// Supabase Realtime subscription for live auction bids
	$effect(() => {
		if (!listing?.id) return;

		const channel = supabase
			.channel(`listing-bids-${listing.id}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'bids',
					filter: `listing_id=eq.${listing.id}`
				},
				(payload) => {
					const newBid = payload.new;
					if (newBid.amount > currentPrice) {
						currentPrice = Number(newBid.amount);
					}
					bidCount += 1;
					bids = [newBid, ...bids].slice(0, 10);
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	});

	// Live Countdown Timer
	let now = $state(Date.now());
	$effect(() => {
		const interval = setInterval(() => {
			now = Date.now();
		}, 1000);
		return () => clearInterval(interval);
	});

	let timeLeft = $derived.by(() => {
		if (!listing?.end_date) return { ended: false, text: 'Ongoing' };
		const diff = new Date(listing.end_date).getTime() - now;
		if (diff <= 0) return { ended: true, text: 'Auction Ended' };

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		const secs = Math.floor((diff % (1000 * 60)) / 1000);

		if (days > 0) return { ended: false, text: `${days}d ${hours}h ${mins}m ${secs}s left` };
		return { ended: false, text: `${hours}h ${mins}m ${secs}s left` };
	});

	// Min next bid
	let minNextBid = $derived(currentPrice + 1);
	let bidAmount = $state('');

	// Seller details
	let sellerAvatar = $derived(
		data.sellerAvatarUrl ??
			`https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.username ?? 'Seller')}&background=random&size=96`
	);

	// Condition formatting
	const CONDITION_LABELS: Record<string, string> = {
		brand_new: 'Brand New',
		like_new: 'Like New',
		open_box: 'Open Box',
		used_good: 'Used – Good',
		used_fair: 'Used – Fair',
		for_parts: 'For Parts / Not Working'
	};
	let condLabel = $derived(
		CONDITION_LABELS[listing?.condition] ?? listing?.condition?.toUpperCase() ?? 'Pre-owned'
	);

	// Action feedback states
	let shareCopied = $state(false);
	let addedToCart = $state(false);
	let isFollowing = $state(false);
	let isWatchlisted = $state(false);
	let isBidding = $state(false);
	let isBuying = $state(false);

	$effect(() => {
		isFollowing = !!data.isFollowing;
		isWatchlisted = !!data.isWatchlisted;
	});

	let isOwner = $derived(
		Boolean(data.currentUser?.id && listing?.seller_id === data.currentUser?.id)
	);

	function openLogin() {
		window.dispatchEvent(new CustomEvent('open-auth-modal'));
	}

	function handleShare() {
		navigator.clipboard.writeText(window.location.href);
		shareCopied = true;
		setTimeout(() => (shareCopied = false), 2500);
	}

	async function handleAddToCartClick() {
		if (!data.currentUser) {
			openLogin();
			return;
		}
		if (isOwner) {
			alert('You are the seller of this product. You cannot add your own product to the cart.');
			return;
		}
		if (!listing.buy_it_now_price) return;
		const res = await addToCart({
			id: listing.id,
			title: listing.title,
			price: listing.buy_it_now_price,
			image_url: activeImage,
			seller_id: listing.seller_id,
			seller_username: profile?.username,
			slug: listing.slug
		});

		if (res.success) {
			addedToCart = true;
			setTimeout(() => (addedToCart = false), 2500);
		} else {
			alert(res.message);
		}
	}
</script>

<svelte:head>
	<title>{listing?.title ?? 'Product'} | PALMYRA</title>
</svelte:head>

<!-- Back button & Share Bar -->
<div class="mb-5 flex items-center justify-between">
	<a
		href="/listings"
		class="inline-flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
	>
		<ArrowLeft class="w-4 h-4" /> Back to Listings
	</a>

	<div class="flex items-center gap-2">
		<!-- Watchlist toggle form -->
		{#if data.currentUser}
			<form
				method="POST"
				action="?/toggleWatchlist"
				use:enhance={() => {
					isWatchlisted = !isWatchlisted;
					return async ({ update }) => update();
				}}
			>
				<button
					type="submit"
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-300 dark:border-stone-700 bg-white/40 dark:bg-stone-800/40 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors cursor-pointer"
					title="Save to watchlist"
				>
					<Heart class="w-3.5 h-3.5 {isWatchlisted ? 'fill-rose-500 text-rose-500' : ''}" />
					{isWatchlisted ? 'Saved' : 'Save'}
				</button>
			</form>
		{/if}

		<!-- Share Button -->
		<button
			onclick={handleShare}
			class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-300 dark:border-stone-700 bg-white/40 dark:bg-stone-800/40 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors cursor-pointer"
		>
			{#if shareCopied}
				<Check class="w-3.5 h-3.5 text-emerald-500" /> Link Copied!
			{:else}
				<Share2 class="w-3.5 h-3.5" /> Share
			{/if}
		</button>
	</div>
</div>

<!-- Notification Banner from Server Actions -->
{#if form?.message}
	<div
		class="mb-6 p-4 rounded-xl text-sm flex items-start gap-3 {form?.success
			? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
			: 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400'}"
	>
		{#if form?.success}
			<CheckCircle2 class="w-5 h-5 shrink-0 mt-0.5" />
		{:else}
			<AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
		{/if}
		<div>
			<strong class="font-semibold block">{form?.success ? 'Success' : 'Notice'}</strong>
			<span>{form.message}</span>
		</div>
	</div>
{/if}

<!-- Main Product Details Grid -->
<div class="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
	<!-- ── LEFT: Product Image Gallery & Description ──────────── -->
	<div class="space-y-6">
		<!-- Hero 4:3 Gallery -->
		<div
			class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 overflow-hidden"
		>
			<div class="aspect-[4/3] w-full bg-stone-200 dark:bg-stone-800 overflow-hidden relative">
				{#if activeImage}
					<img
						src={activeImage}
						alt={listing.title}
						class="w-full h-full object-cover"
						loading="eager"
					/>
				{:else}
					<div class="flex h-full items-center justify-center text-stone-400 dark:text-stone-500">
						No image available
					</div>
				{/if}

				<!-- Category badge on image -->
				{#if listing.subcategories?.name}
					<span
						class="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium"
					>
						{listing.subcategories.name}
					</span>
				{/if}
			</div>

			<!-- Thumbnail strip -->
			{#if images.length > 1}
				<div class="flex gap-2.5 p-3 overflow-x-auto bg-stone-100/50 dark:bg-stone-900/50">
					{#each images as img, idx (img.id || idx)}
						<button
							onclick={() => (activeIdx = idx)}
							class="shrink-0 w-20 aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all cursor-pointer {activeIdx ===
							idx
								? 'border-indigo-600 scale-105'
								: 'border-transparent opacity-70 hover:opacity-100'}"
							aria-label={`View image ${idx + 1}`}
						>
							<img src={img.image_url} alt="" class="w-full h-full object-cover" loading="lazy" />
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Product Description & Specifications Card -->
		<div
			class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-6 md:p-8"
		>
			<h2 class="text-xl font-bold text-stone-900 dark:text-stone-100 mb-4">Description</h2>
			<div
				class="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line mb-6"
			>
				{listing.description || 'No description provided by the seller.'}
			</div>

			<!-- Meta Details Grid -->
			<div class="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-stone-300/40 dark:border-stone-700/40 text-xs">
				<div>
					<span class="text-stone-500 dark:text-stone-400 block mb-0.5">Condition</span>
					<strong class="text-stone-800 dark:text-stone-200 font-semibold">{condLabel}</strong>
				</div>
				<div>
					<span class="text-stone-500 dark:text-stone-400 block mb-0.5">Quantity Available</span>
					<strong class="text-stone-800 dark:text-stone-200 font-semibold">{listing.quantity ?? 1}</strong>
				</div>
				<div>
					<span class="text-stone-500 dark:text-stone-400 block mb-0.5">Listing Status</span>
					<strong class="capitalize font-semibold {listing.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-500'}">
						{listing.status}
					</strong>
				</div>
			</div>
		</div>

		<!-- Bid History Section -->
		{#if bids.length > 0}
			<div
				class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-6"
			>
				<h3 class="text-lg font-bold text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2">
					<Gavel class="w-5 h-5 text-indigo-500" />
					Recent Bid Activity ({bidCount} total)
				</h3>

				<div class="divide-y divide-stone-200/40 dark:divide-stone-700/40 text-sm">
					{#each bids as b, idx (b.id || idx)}
						<div class="py-2.5 flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs flex items-center justify-center font-bold">
									#{idx + 1}
								</span>
								<span class="font-medium text-stone-800 dark:text-stone-200">
									{(Array.isArray(b.profiles) ? b.profiles[0]?.username : b.profiles?.username) || 'Bidder'}
								</span>
								{#if idx === 0}
									<span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold uppercase">
										Highest Bid
									</span>
								{/if}
							</div>
							<div class="text-right">
								<span class="font-bold text-stone-900 dark:text-stone-100">
									₹{Number(b.amount).toLocaleString('en-IN')}
								</span>
								<span class="text-xs text-stone-400 block">
									{new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
								</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- ── RIGHT: Pricing, Auction Bidding & Seller Actions ───── -->
	<div class="space-y-6">
		<!-- Pricing & Bid Actions Card -->
		<div
			class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-6 md:p-8 space-y-6"
		>
			<!-- Title & Views Header -->
			<div>
				<h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100 leading-snug mb-2">
					{listing.title}
				</h1>
				<div class="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
					<span class="flex items-center gap-1">
						<Eye class="w-3.5 h-3.5" /> {listing.views ?? 0} views
					</span>
					<span>•</span>
					<span>Listed {new Date(listing.created_at).toLocaleDateString()}</span>
				</div>
			</div>

			<!-- Price & Auction Status Box -->
			<div class="p-4 rounded-xl bg-white/50 dark:bg-stone-800/50 border border-stone-200/50 dark:border-stone-700/50 space-y-3">
				<div class="flex items-baseline justify-between">
					<span class="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
						{listing.buy_it_now_price && !listing.starting_price ? 'Price' : 'Current Bid'}
					</span>
					<span class="text-2xl font-extrabold text-stone-900 dark:text-stone-50">
						₹{currentPrice.toLocaleString('en-IN')}
					</span>
				</div>

				{#if listing.starting_price}
					<div class="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-2 border-t border-stone-200 dark:border-stone-700">
						<span>Starting price: ₹{Number(listing.starting_price).toLocaleString('en-IN')}</span>
						<span>{bidCount} bids placed</span>
					</div>
				{/if}

				<!-- Countdown Timer -->
				<div class="pt-2 flex items-center justify-between text-xs font-medium">
					<span class="text-stone-500 dark:text-stone-400 flex items-center gap-1">
						<Clock class="w-3.5 h-3.5" /> Time Remaining:
					</span>
					<span class={timeLeft.ended ? 'text-rose-500 font-bold' : 'text-indigo-600 dark:text-indigo-400 font-bold'}>
						{timeLeft.text}
					</span>
				</div>
			</div>

			<!-- AUCTION BIDDING FORM -->
			{#if !timeLeft.ended && listing.status === 'active'}
				<div class="space-y-3">
					<h3 class="text-sm font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
						<Gavel class="w-4 h-4 text-indigo-500" /> Place a Bid
					</h3>

					{#if isOwner}
						<div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
							<AlertCircle class="w-4 h-4 shrink-0" />
							<span>You are the seller of this product. You cannot bid on your own auction.</span>
						</div>
					{:else if !data.currentUser}
						<button
							type="button"
							onclick={openLogin}
							class="w-full py-3.5 rounded-xl bg-linear-to-r from-indigo-600 to-indigo-700 hover:opacity-95 text-white font-semibold text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
						>
							<Gavel class="w-4 h-4" /> Sign In to Place Bid
						</button>
					{:else}
						<form
							method="POST"
							action="?/placeBid"
							use:enhance={() => {
								isBidding = true;
								return async ({ result, update }) => {
									if (result.type === 'success') {
										const newAmount = (result.data as any)?.newAmount;
										const fb = (result.data as any)?.fallbackBid;
										if (fb) {
											addLocalBid({
												id: fb.id,
												listing_id: fb.listing_id,
												bidder_id: fb.bidder_id,
												amount: fb.amount,
												created_at: fb.created_at,
												title: listing.title,
												slug: listing.slug,
												image_url: activeImage,
												current_highest: newAmount,
												end_date: listing.end_date,
												is_winning: true
											});
										}
										if (newAmount) {
											currentPrice = Number(newAmount);
											bidCount += 1;
											bids = [
												{
													id: crypto.randomUUID(),
													amount: newAmount,
													created_at: new Date().toISOString(),
													profiles: { username: data.currentUser?.email?.split('@')[0] ?? 'You' }
												},
												...bids
											].slice(0, 10);
										}
										bidAmount = '';
									}
									await update();
									isBidding = false;
								};
							}}
							class="space-y-2.5"
						>
							<div class="relative">
								<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-semibold">₹</span>
								<input
									id="bid-input"
									name="bid_amount"
									type="number"
									min={minNextBid}
									step="1"
									required
									placeholder={`Min bid: ₹${minNextBid.toLocaleString('en-IN')}`}
									bind:value={bidAmount}
									class="w-full pl-8 pr-4 py-3 rounded-xl bg-white/60 dark:bg-stone-800/60 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
								/>
							</div>

							<button
								type="submit"
								disabled={isBidding || !bidAmount || Number(bidAmount) <= currentPrice}
								class="w-full py-3.5 rounded-xl bg-linear-to-r from-indigo-600 to-indigo-700 hover:opacity-95 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
							>
								{#if isBidding}
									<span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
									Submitting Bid...
								{:else}
									<Gavel class="w-4 h-4" /> Place Bid
								{/if}
							</button>

							{#if form?.bidPlaced}
								<p class="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 pt-1">
									<CheckCircle2 class="w-4 h-4 shrink-0 text-emerald-500" />
									<span>{form.message}</span>
								</p>
							{:else if form?.message && !form?.success && !form?.buyNowSubmitted}
								<p class="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5 pt-1">
									<AlertCircle class="w-4 h-4 shrink-0 text-rose-500" />
									<span>{form.message}</span>
								</p>
							{/if}
						</form>
					{/if}
				</div>
			{/if}

			<!-- BUY NOW ACTION (Phase 4) -->
			{#if listing.buy_it_now_price && listing.status === 'active'}
				<div class="pt-4 border-t border-stone-300/40 dark:border-stone-700/40 space-y-3">
					<div class="flex items-center justify-between">
						<div>
							<span class="text-xs text-stone-500 dark:text-stone-400 block">Buy It Now Price</span>
							<span class="text-xl font-bold text-emerald-600 dark:text-emerald-400">
								₹{Number(listing.buy_it_now_price).toLocaleString('en-IN')}
							</span>
						</div>
					</div>

					{#if isOwner}
						<div class="p-3 rounded-xl bg-stone-200/50 dark:bg-stone-800/50 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 text-xs flex items-center gap-2">
							<AlertCircle class="w-4 h-4 shrink-0" />
							<span>You cannot purchase your own product.</span>
						</div>
					{:else if !data.currentUser}
						<button
							type="button"
							onclick={openLogin}
							class="w-full py-3.5 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-stone-100 dark:text-stone-900 font-semibold text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
						>
							<ShoppingBag class="w-4 h-4" /> Sign In to Buy Now
						</button>
					{:else}
						<!-- Buy Now Request Button -->
						<form
							method="POST"
							action="?/buyNow"
							use:enhance={() => {
								isBuying = true;
								return async ({ result, update }) => {
									if (result.type === 'success' && (result.data as any)?.buyNowSubmitted) {
										const fallbackOrder = (result.data as any)?.fallbackOrder;
										if (fallbackOrder) {
											addLocalOrder(fallbackOrder);
										}
									}
									await update();
									isBuying = false;
								};
							}}
						>
							<button
								type="submit"
								disabled={isBuying}
								class="w-full py-3.5 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-stone-100 dark:text-stone-900 font-semibold text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
							>
								{#if isBuying}
									<span class="inline-block w-4 h-4 border-2 border-stone-400 border-t-stone-800 rounded-full animate-spin"></span>
									Requesting Purchase...
								{:else}
									<ShoppingBag class="w-4 h-4" /> Buy Now (Purchase Request)
								{/if}
							</button>

							{#if form?.buyNowSubmitted}
								<p class="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 pt-1">
									<CheckCircle2 class="w-4 h-4 shrink-0 text-emerald-500" />
									<span>{form.message}</span>
								</p>
							{/if}
						</form>
					{/if}

					<!-- Add to Cart Button (Phase 5) -->
					<button
						onclick={handleAddToCartClick}
						class="w-full py-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-100/50 dark:bg-stone-800/50 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
					>
						{#if addedToCart}
							<Check class="w-4 h-4 text-emerald-600" /> Added to Cart!
						{:else}
							<ShoppingCart class="w-4 h-4" /> Add to Cart
						{/if}
					</button>
				</div>
			{/if}
		</div>

		<!-- Seller Profile Information Card (Phase 3) -->
		<div
			class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-6 space-y-4"
		>
			<div class="flex items-center gap-4">
				<img
					src={sellerAvatar}
					alt={profile?.username ?? 'Seller'}
					class="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-stone-700 shadow-sm"
				/>

				<div class="flex-1 min-w-0">
					<h4 class="font-bold text-stone-900 dark:text-stone-100 truncate">
						{profile?.full_name || profile?.username || 'Seller'}
					</h4>
					<p class="text-xs text-stone-500 dark:text-stone-400">
						@{profile?.username ?? 'user'}
					</p>

					<!-- Rating -->
					{#if (profile?.total_reviews ?? 0) > 0}
						<div class="flex items-center gap-1 mt-1 text-xs text-amber-500">
							<Star class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
							<span class="font-semibold text-stone-700 dark:text-stone-300">
								{Number(profile.rating ?? 5.0).toFixed(1)}
							</span>
							<span class="text-stone-400">({profile.total_reviews} reviews)</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Seller Actions: Follow & Profile Link -->
			<div class="grid grid-cols-2 gap-3 pt-2">
				{#if data.currentUser && data.currentUser.id !== listing.seller_id}
					<form
						method="POST"
						action="?/toggleFollow"
						use:enhance={() => {
							isFollowing = !isFollowing;
							return async ({ update }) => update();
						}}
					>
						<input type="hidden" name="seller_id" value={listing.seller_id} />
						<button
							type="submit"
							class="w-full py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white/50 dark:bg-stone-800/50 hover:bg-stone-200 dark:hover:bg-stone-700 text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
						>
							{#if isFollowing}
								<UserCheck class="w-3.5 h-3.5 text-indigo-500" /> Following
							{:else}
								<UserPlus class="w-3.5 h-3.5" /> Follow Seller
							{/if}
						</button>
					</form>
				{:else}
					<div></div>
				{/if}

				<a
					href={`/u/${profile?.username}`}
					class="py-2.5 rounded-xl bg-stone-200/60 dark:bg-stone-700/40 hover:bg-stone-300 dark:hover:bg-stone-600 text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center justify-center gap-1.5 transition-colors"
				>
					<ExternalLink class="w-3.5 h-3.5" /> View Profile
				</a>
			</div>
		</div>

		<!-- Trust & Protection Box -->
		<div
			class="p-4 rounded-2xl bg-stone-200/20 dark:bg-stone-800/20 border border-white/20 dark:border-stone-700/20 text-xs text-stone-600 dark:text-stone-400 space-y-2"
		>
			<div class="flex items-center gap-2 font-semibold text-stone-800 dark:text-stone-200">
				<ShieldCheck class="w-4 h-4 text-emerald-500" /> Buyer Protection & Approval
			</div>
			<p>
				Orders on Palmyra are reviewed and approved directly by the seller. No payment is charged until order acceptance.
			</p>
		</div>
	</div>
</div>
