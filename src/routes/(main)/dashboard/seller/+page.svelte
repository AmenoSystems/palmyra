<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Package,
		CheckCircle,
		AlertCircle,
		PlusCircle,
		Check,
		X,
		ShoppingBag,
		Eye,
		ExternalLink,
		Gavel,
	} from 'lucide-svelte';
	import ProductListingModal from '$lib/components/ProductListingModal.svelte';
	import { getLocalOrders, updateLocalOrderStatus, getLocalBids, recordAuctionSale } from '$lib/orders';

	let { data, form } = $props();

	let activeTab = $state<'requests' | 'listings' | 'bids'>('requests');
	let listingFilter = $state<'all' | 'active' | 'sold' | 'inactive'>('all');
	let showCreateModal = $state(false);

	let purchaseRequests = $state<any[]>([]);
	let incomingBids = $state<any[]>([]);

	function syncData() {
		// 1. Sync Purchase Requests
		const localOrders = getLocalOrders().filter((o) => o.seller_id === data.user?.id);
		const serverOrders = data.purchaseRequests ?? [];
		const combinedOrders = [...serverOrders];
		for (const l of localOrders) {
			if (!combinedOrders.some((c) => c.id === l.id)) {
				const img = l.listing?.listing_images?.[0]?.image_url ?? null;
				combinedOrders.push({
					id: l.id,
					listing_id: l.listing_id,
					title: l.listing?.title ?? 'Product',
					slug: l.listing?.slug ?? l.listing_id,
					image_url: img,
					price: Number(l.price),
					status: l.status,
					created_at: l.created_at,
					buyer_id: l.buyer_id,
					buyer_username: l.buyer?.username ?? 'Buyer',
					buyer_name: l.buyer?.username ?? 'Buyer'
				});
			}
		}
		purchaseRequests = combinedOrders;

		// 2. Sync Incoming Bids
		const sellerListingIds = (data.listings ?? []).map((l: any) => l.id);
		const localBids = getLocalBids().filter(
			(b) => b.seller_id === data.user?.id || sellerListingIds.includes(b.listing_id)
		);
		const serverBids = data.incomingBids ?? [];
		const combinedBids = [...serverBids];
		for (const lb of localBids) {
			if (!combinedBids.some((cb) => cb.id === lb.id || (cb.listing_id === lb.listing_id && cb.amount === lb.amount))) {
				const parent = (data.listings ?? []).find((l: any) => l.id === lb.listing_id);
				combinedBids.push({
					id: lb.id,
					amount: Number(lb.amount),
					created_at: lb.created_at,
					bidder_id: lb.bidder_id,
					listing_id: lb.listing_id,
					bidder_username: lb.bidder_username ?? 'Bidder',
					listing_title: lb.title ?? parent?.title ?? 'Auction Item',
					listing_slug: lb.slug ?? parent?.slug ?? lb.listing_id,
					end_date: lb.end_date ?? parent?.end_date,
					status: lb.status ?? 'active'
				});
			}
		}
		combinedBids.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
		incomingBids = combinedBids;
	}

	$effect(() => {
		syncData();
		window.addEventListener('orders-updated', syncData);
		window.addEventListener('bids-updated', syncData);
		return () => {
			window.removeEventListener('orders-updated', syncData);
			window.removeEventListener('bids-updated', syncData);
		};
	});

	let pendingRequestsCount = $derived(
		purchaseRequests.filter((r) => r.status === 'Pending Seller Approval').length
	);
	let acceptedOrdersCount = $derived(
		purchaseRequests.filter((r) => r.status === 'Accepted').length
	);
	let totalSalesValue = $derived(
		purchaseRequests
			.filter((r) => r.status === 'Accepted')
			.reduce((sum, r) => sum + (Number(r.price) || 0), 0)
	);

	function isItemActive(item: any): boolean {
		if (!item || item.status !== 'active') return false;
		if (item.end_date && new Date(item.end_date) <= new Date()) return false;
		return true;
	}

	function isListingSold(listingId: string): boolean {
		const parent = (data.listings ?? []).find((l: any) => l.id === listingId);
		if (parent?.status === 'sold') return true;
		const hasAcceptedOrder = purchaseRequests.some(
			(r) => r.listing_id === listingId && r.status === 'Accepted'
		);
		if (hasAcceptedOrder) return true;
		const winningBid = incomingBids.find((b) => b.listing_id === listingId && b.status === 'won');
		return !!winningBid;
	}

	let filteredListings = $derived.by(() => {
		if (listingFilter === 'all') return data.listings;
		if (listingFilter === 'active') return data.listings.filter((l: any) => isItemActive(l));
		if (listingFilter === 'sold') return data.listings.filter((l: any) => l.status === 'sold');
		if (listingFilter === 'inactive') return data.listings.filter((l: any) => !isItemActive(l) && l.status !== 'sold');
		return data.listings.filter((l: any) => l.status === listingFilter);
	});

	const STATUS_STYLES: Record<string, string> = {
		'Pending Seller Approval':
			'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
		Accepted: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
		Rejected: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
		Cancelled: 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/30'
	};
</script>

<svelte:head>
	<title>Seller Dashboard | PALMYRA</title>
</svelte:head>

<div class="max-w-6xl mx-auto space-y-6">
	<!-- Top Bar -->
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
				<Package class="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
				Seller Dashboard
			</h1>
			<p class="text-xs text-stone-500 dark:text-stone-400">
				Manage your product catalog, review purchase requests, and monitor sales.
			</p>
		</div>

		<div class="flex items-center gap-2.5">
			<!-- Link to Buyer Dashboard -->
			<a
				href="/dashboard/buyer"
				class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-200/60 dark:bg-stone-700/40 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-colors"
			>
				<ShoppingBag class="w-4 h-4 text-indigo-500" /> Buyer Hub
			</a>

			<!-- Publish Product Button -->
			<button
				onclick={() => (showCreateModal = true)}
				class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
			>
				<PlusCircle class="w-4 h-4" /> + List New Product
			</button>
		</div>
	</div>

	<!-- Status Message -->
	{#if form?.message}
		<div
			class="p-4 rounded-xl text-sm flex items-center gap-2.5 {form?.success
				? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
				: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'}"
		>
			{#if form?.success}
				<CheckCircle class="w-5 h-5 shrink-0" />
			{:else}
				<AlertCircle class="w-5 h-5 shrink-0" />
			{/if}
			<span>{form.message}</span>
		</div>
	{/if}

	<!-- ── SALES OVERVIEW STATS (Phase 8) ────────────────────────── -->
	<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
		<div
			class="p-4 rounded-2xl backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 border border-white/20 dark:border-gray-700/30 text-center"
		>
			<span class="text-xs text-stone-500 dark:text-stone-400 block mb-1">Total Listings</span>
			<span class="text-2xl font-bold text-stone-900 dark:text-stone-100">{data.stats.totalListings}</span>
		</div>

		<div
			class="p-4 rounded-2xl backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 border border-white/20 dark:border-gray-700/30 text-center"
		>
			<span class="text-xs text-stone-500 dark:text-stone-400 block mb-1">Active</span>
			<span class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.listings.filter((l: any) => isItemActive(l)).length}</span>
		</div>

		<div
			class="p-4 rounded-2xl backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 border border-white/20 dark:border-gray-700/30 text-center"
		>
			<span class="text-xs text-stone-500 dark:text-stone-400 block mb-1">Sold Items</span>
			<span class="text-2xl font-bold text-stone-900 dark:text-stone-100">{data.stats.soldProducts}</span>
		</div>

		<div
			class="p-4 rounded-2xl backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 border border-white/20 dark:border-gray-700/30 text-center {pendingRequestsCount > 0 ? 'ring-2 ring-amber-500/50' : ''}"
		>
			<span class="text-xs text-stone-500 dark:text-stone-400 block mb-1">Pending Approval</span>
			<span class="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingRequestsCount}</span>
		</div>

		<div
			class="p-4 rounded-2xl backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 border border-white/20 dark:border-gray-700/30 text-center"
		>
			<span class="text-xs text-stone-500 dark:text-stone-400 block mb-1">Accepted Orders</span>
			<span class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{acceptedOrdersCount}</span>
		</div>

		<div
			class="p-4 rounded-2xl backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 border border-white/20 dark:border-gray-700/30 text-center"
		>
			<span class="text-xs text-stone-500 dark:text-stone-400 block mb-1">Sales Value</span>
			<span class="text-xl font-bold text-emerald-600 dark:text-emerald-400">
				₹{totalSalesValue.toLocaleString('en-IN')}
			</span>
		</div>
	</div>

	<!-- ── NAVIGATION TABS ────────────────────────────────────────── -->
	<div class="flex border-b border-stone-300/40 dark:border-stone-700/40 gap-2">
		<button
			onclick={() => (activeTab = 'requests')}
			class="px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 {activeTab ===
			'requests'
				? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
				: 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900'}"
		>
			<ShoppingBag class="w-4 h-4" /> Purchase Requests
			{#if pendingRequestsCount > 0}
				<span class="px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white font-bold">
					{pendingRequestsCount}
				</span>
			{/if}
		</button>

		<button
			onclick={() => (activeTab = 'listings')}
			class="px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 {activeTab ===
			'listings'
				? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
				: 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900'}"
		>
			<Package class="w-4 h-4" /> My Listings ({data.listings.length})
		</button>

		<button
			onclick={() => (activeTab = 'bids')}
			class="px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 {activeTab ===
			'bids'
				? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
				: 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900'}"
		>
			<Gavel class="w-4 h-4" /> Incoming Bids ({incomingBids.length})
		</button>
	</div>

	<!-- ── TAB 1: PURCHASE REQUESTS (Phase 8) ────────────────────── -->
	{#if activeTab === 'requests'}
		{#if purchaseRequests.length === 0}
			<div
				class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-12 text-center"
			>
				<ShoppingBag class="w-12 h-12 text-stone-400 mx-auto mb-3" />
				<h3 class="text-lg font-bold text-stone-800 dark:text-stone-200 mb-1">
					No purchase requests yet
				</h3>
				<p class="text-xs text-stone-500 dark:text-stone-400">
					Incoming orders from buyers clicking "Buy Now" will appear here for your approval.
				</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each purchaseRequests as req (req.id)}
					<div
						class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-4 sm:p-5 flex flex-wrap sm:flex-nowrap gap-4 items-center justify-between"
					>
						<!-- Left: Product & Buyer Info -->
						<div class="flex items-center gap-4 min-w-0">
							<a
								href={`/listings/${req.slug}`}
								class="w-16 sm:w-20 aspect-[4/3] rounded-xl overflow-hidden bg-stone-300 dark:bg-stone-700 shrink-0"
							>
								{#if req.image_url}
									<img src={req.image_url} alt={req.title} class="w-full h-full object-cover" />
								{:else}
									<div class="w-full h-full flex items-center justify-center text-xs text-stone-400">
										No img
									</div>
								{/if}
							</a>

							<div class="min-w-0">
								<a
									href={`/listings/${req.slug}`}
									class="font-semibold text-stone-900 dark:text-stone-100 hover:underline line-clamp-1 text-sm sm:text-base"
								>
									{req.title}
								</a>
								<p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
									Buyer: <span class="font-medium text-stone-800 dark:text-stone-200">@{req.buyer_username}</span>
									• Requested {new Date(req.created_at).toLocaleDateString()}
								</p>
								<div class="mt-1 text-base font-bold text-stone-900 dark:text-stone-100">
									₹{req.price.toLocaleString('en-IN')}
								</div>
							</div>
						</div>

						<!-- Right: Status & Actions -->
						<div class="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200 dark:border-stone-700">
							<span
								class="px-3 py-1 text-xs font-semibold rounded-full border {STATUS_STYLES[
									req.status
								] ?? 'bg-stone-100 text-stone-700'}"
							>
								{req.status}
							</span>

							{#if req.status === 'Pending Seller Approval'}
								<!-- Approve Action -->
								<form
									method="POST"
									action="?/approveRequest"
									use:enhance={() => {
										updateLocalOrderStatus(req.id, 'Accepted');
										req.status = 'Accepted';
										return async ({ update }) => update();
									}}
								>
									<input type="hidden" name="order_id" value={req.id} />
									<input type="hidden" name="listing_id" value={req.listing_id} />
									<button
										type="submit"
										class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
									>
										<Check class="w-3.5 h-3.5" /> Approve
									</button>
								</form>

								<!-- Reject Action -->
								<form
									method="POST"
									action="?/rejectRequest"
									use:enhance={() => {
										updateLocalOrderStatus(req.id, 'Rejected');
										req.status = 'Rejected';
										return async ({ update }) => update();
									}}
								>
									<input type="hidden" name="order_id" value={req.id} />
									<input type="hidden" name="listing_id" value={req.listing_id} />
									<button
										type="submit"
										class="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
									>
										<X class="w-3.5 h-3.5" /> Reject
									</button>
								</form>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

	<!-- ── TAB 2: MY LISTINGS (Phase 8) ─────────────────────────── -->
	{:else if activeTab === 'listings'}
		<!-- Filter pills -->
		<div class="flex flex-wrap items-center gap-2 mb-4">
			{#each ['all', 'active', 'sold', 'inactive'] as f}
				<button
					onclick={() => (listingFilter = f as any)}
					class="px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors cursor-pointer {listingFilter ===
					f
						? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
						: 'bg-stone-200/50 dark:bg-stone-700/40 text-stone-700 dark:text-stone-300 hover:bg-stone-300'}"
				>
					{f} Listings
				</button>
			{/each}
		</div>

		{#if filteredListings.length === 0}
			<div
				class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-12 text-center"
			>
				<Package class="w-12 h-12 text-stone-400 mx-auto mb-3" />
				<h3 class="text-lg font-bold text-stone-800 dark:text-stone-200 mb-1">
					No listings match this filter
				</h3>
				<p class="text-xs text-stone-500 dark:text-stone-400 mb-4">
					Publish your products to reach active buyers on Palmyra.
				</p>
				<button
					onclick={() => (showCreateModal = true)}
					class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700 transition-colors cursor-pointer"
				>
					+ Create First Listing
				</button>
			</div>
		{:else}
			<div class="space-y-3">
				{#each filteredListings as item (item.id)}
					<div
						class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-4 sm:p-5 flex flex-wrap sm:flex-nowrap gap-4 items-center justify-between"
					>
						<!-- Left: Product Image & Info -->
						<div class="flex items-center gap-4 min-w-0">
							<a
								href={`/listings/${item.slug}`}
								class="w-20 aspect-[4/3] rounded-xl overflow-hidden bg-stone-300 dark:bg-stone-700 shrink-0"
							>
								{#if item.primary_image}
									<img
										src={item.primary_image}
										alt={item.title}
										class="w-full h-full object-cover"
									/>
								{:else}
									<div class="w-full h-full flex items-center justify-center text-xs text-stone-400">
										No img
									</div>
								{/if}
							</a>

							<div class="min-w-0">
								<a
									href={`/listings/${item.slug}`}
									class="font-semibold text-stone-900 dark:text-stone-100 hover:underline line-clamp-1 text-sm sm:text-base"
								>
									{item.title}
								</a>
								<div class="flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-stone-400 mt-1">
									<span class="capitalize">{item.condition?.replace('_', ' ') ?? 'Standard'}</span>
									<span>•</span>
									<span class="flex items-center gap-1" title="Unique visitor views">
										<Eye class="w-3.5 h-3.5 text-stone-400" /> {item.views ?? 0} views
									</span>
									<span>•</span>
									<span>Ends: {item.end_date ? new Date(item.end_date).toLocaleDateString() : 'Ongoing'}</span>
								</div>

								<!-- Prices -->
								<div class="flex items-center gap-4 mt-2 text-xs">
									<div>
										<span class="text-stone-400">Current Bid:</span>
										<strong class="text-stone-900 dark:text-stone-100 ml-1">
											₹{Number(item.current_price ?? item.starting_price ?? 0).toLocaleString('en-IN')}
										</strong>
									</div>
									{#if item.buy_it_now_price}
										<div>
											<span class="text-stone-400">Buy Now:</span>
											<strong class="text-emerald-600 dark:text-emerald-400 ml-1">
												₹{Number(item.buy_it_now_price).toLocaleString('en-IN')}
											</strong>
										</div>
									{/if}
								</div>
							</div>
						</div>

						<!-- Right: Status Toggle & Actions -->
						<div class="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200 dark:border-stone-700">
							<span
								class="px-2.5 py-1 text-xs font-semibold rounded-full border uppercase {item.status === 'sold'
									? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30'
									: isItemActive(item)
										? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
										: 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/30'}"
							>
								{item.status === 'sold' ? 'sold' : isItemActive(item) ? 'active' : 'inactive'}
							</span>

							<!-- Seller Option: Close Auction & Sell to Top Bidder -->
							{#if isItemActive(item) && !isListingSold(item.id) && incomingBids.some((b) => b.listing_id === item.id)}
								<form
									method="POST"
									action="?/closeAndSell"
									use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'success' && (result.data as any)?.saleDetails) {
												recordAuctionSale((result.data as any).saleDetails);
												item.status = 'sold';
											}
											await update();
										};
									}}
								>
									<input type="hidden" name="listing_id" value={item.id} />
									<input
										type="hidden"
										name="price"
										value={item.current_price ?? item.starting_price}
									/>
									<button
										type="submit"
										class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
										title="Close auction immediately and sell to the current highest bidder"
									>
										<Gavel class="w-3.5 h-3.5" /> Sell to Top Bidder
									</button>
								</form>
							{/if}

							<!-- Toggle Active / Inactive -->
							{#if item.status !== 'sold'}
								<form method="POST" action="?/toggleListingStatus" use:enhance>
									<input type="hidden" name="listing_id" value={item.id} />
									<input
										type="hidden"
										name="action"
										value={isItemActive(item) ? 'deactivate' : 'activate'}
									/>
									<input
										type="hidden"
										name="new_status"
										value={isItemActive(item) ? 'ended' : 'active'}
									/>
									<button
										type="submit"
										class="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
									>
										{isItemActive(item) ? 'Deactivate' : 'Activate'}
									</button>
								</form>
							{/if}

							<a
								href={`/listings/${item.slug}`}
								class="p-2 rounded-lg bg-stone-200/60 dark:bg-stone-700/40 hover:bg-stone-300 text-stone-700 dark:text-stone-300"
								title="View public product page"
							>
								<ExternalLink class="w-4 h-4" />
							</a>
						</div>
					</div>
				{/each}
			</div>
		{/if}

	<!-- ── TAB 3: INCOMING BIDS (Phase 8) ────────────────────────── -->
	{:else if activeTab === 'bids'}
		{#if incomingBids.length === 0}
			<div
				class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-12 text-center"
			>
				<Gavel class="w-12 h-12 text-stone-400 mx-auto mb-3" />
				<h3 class="text-lg font-bold text-stone-800 dark:text-stone-200 mb-1">
					No bids placed yet
				</h3>
				<p class="text-xs text-stone-500 dark:text-stone-400">
					When buyers place bids on your auction items, they will appear here in real time.
				</p>
			</div>
		{:else}
			<div
				class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-6 divide-y divide-stone-200/40 dark:divide-stone-700/40"
			>
				{#each incomingBids as bid (bid.id)}
					<div class="py-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
						<div class="min-w-0">
							<a
								href={`/listings/${bid.listing_slug}`}
								class="font-semibold text-stone-900 dark:text-stone-100 hover:underline text-sm block"
							>
								{bid.listing_title}
							</a>
							<p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
								Bidder: <span class="font-medium text-stone-700 dark:text-stone-300">@{bid.bidder_username}</span>
								• {new Date(bid.created_at).toLocaleString([], {
									day: 'numeric',
									month: 'short',
									year: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</p>
						</div>

						<div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
							<div class="text-right">
								<span class="text-lg font-bold text-emerald-600 dark:text-emerald-400 block">
									₹{bid.amount.toLocaleString('en-IN')}
								</span>
								<a
									href={`/listings/${bid.listing_slug}`}
									class="text-xs text-indigo-500 hover:underline"
								>
									View Listing →
								</a>
							</div>

							<!-- Seller Action: Close Bidding & Sell to This Highest Bidder -->
							{#if isListingSold(bid.listing_id) || bid.status === 'won'}
								<span class="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5">
									<Check class="w-3.5 h-3.5 text-emerald-600" /> Sold to Bidder
								</span>
							{:else}
								<form
									method="POST"
									action="?/closeAndSell"
									use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'success' && (result.data as any)?.saleDetails) {
												recordAuctionSale((result.data as any).saleDetails);
												incomingBids = incomingBids.map((b) =>
													b.listing_id === bid.listing_id
														? { ...b, status: b.bidder_id === bid.bidder_id ? 'won' : 'closed' }
														: b
												);
											}
											await update();
										};
									}}
								>
									<input type="hidden" name="listing_id" value={bid.listing_id} />
									<input type="hidden" name="buyer_id" value={bid.bidder_id} />
									<input type="hidden" name="buyer_username" value={bid.bidder_username} />
									<input type="hidden" name="price" value={bid.amount} />
									<button
										type="submit"
										class="px-3 py-1.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
										title="Close auction immediately and sell to this bidder"
									>
										<Check class="w-3.5 h-3.5" /> Accept Bid & Sell
									</button>
								</form>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<!-- Modal Overlay for Publishing Product (Phase 2) -->
<ProductListingModal
	open={showCreateModal}
	onClose={() => (showCreateModal = false)}
	onPublished={() => {}}
/>
