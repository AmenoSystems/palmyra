<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		ShoppingBag,
		Gavel,
		Clock,
		CheckCircle,
		CheckCircle2,
		XCircle,
		AlertCircle,
		ArrowRight,
		ExternalLink,
		Ban,
		Store,
		PackageCheck,
		FileText,
		Truck
	} from 'lucide-svelte';

	import { getLocalOrders, getLocalBids, type LocalBidRecord } from '$lib/orders';

	let { data, form } = $props();

	let activeTab = $state<'purchases' | 'bids' | 'tracking'>('purchases');
	let trackingFilter = $state<'all' | 'orders' | 'bids'>('all');
	let purchases = $state<any[]>([]);
	let myBids = $state<any[]>([]);

	function syncData() {
		// 1. Sync Purchases / Orders
		const localOrders = getLocalOrders().filter(
			(o) => !o.buyer_id || !data.user?.id || o.buyer_id === data.user?.id
		);
		const serverOrders = data.purchases ?? [];
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
					seller_username: 'Seller'
				});
			}
		}
		purchases = combinedOrders;

		// 2. Sync Bids
		const localBids = getLocalBids().filter(
			(b) => !b.bidder_id || !data.user?.id || b.bidder_id === data.user?.id
		);
		const serverBids = data.myBids ?? [];
		const combinedBids = [...serverBids];
		for (const lb of localBids) {
			const existingIdx = combinedBids.findIndex((cb) => cb.listing_id === lb.listing_id);
			if (existingIdx === -1) {
				combinedBids.push({
					bid_id: lb.id,
					listing_id: lb.listing_id,
					title: lb.title ?? 'Auction Item',
					slug: lb.slug ?? lb.listing_id,
					image_url: lb.image_url ?? null,
					my_bid: Number(lb.amount),
					current_highest: Number(lb.current_highest ?? lb.amount),
					end_date: lb.end_date,
					is_ended: lb.end_date ? new Date(lb.end_date) < new Date() : false,
					is_winning: lb.is_winning ?? (lb.status === 'won' || lb.status === 'active'),
					status: lb.status ?? 'active',
					listing_status: 'active'
				});
			} else {
				if (lb.status) {
					combinedBids[existingIdx].status = lb.status;
					if (lb.status === 'won') {
						combinedBids[existingIdx].is_winning = true;
					} else if (lb.status === 'outbid') {
						combinedBids[existingIdx].is_winning = false;
					}
				}
				if (lb.current_highest) {
					combinedBids[existingIdx].current_highest = Number(lb.current_highest);
				}
			}
		}
		myBids = combinedBids;
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

	const STATUS_STYLES: Record<string, string> = {
		'Pending Seller Approval':
			'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
		Accepted: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
		Rejected: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
		Cancelled: 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/30',
		Processing: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
		Delivered: 'bg-emerald-600/10 text-emerald-800 dark:text-emerald-300 border-emerald-600/30'
	};
</script>

<svelte:head>
	<title>Buyer Dashboard | PALMYRA</title>
</svelte:head>

<div class="max-w-5xl mx-auto space-y-6">
	<!-- Top Navigation / Title Bar -->
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
				<ShoppingBag class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
				Buyer Dashboard
			</h1>
			<p class="text-xs text-stone-500 dark:text-stone-400">
				Track your purchase requests, auction bids, and order statuses.
			</p>
		</div>

		<!-- Switch to Seller Dashboard -->
		<a
			href="/dashboard/seller"
			class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-200/60 dark:bg-stone-700/40 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-colors"
		>
			<Store class="w-4 h-4 text-emerald-600" /> Switch to Seller Dashboard
		</a>
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

	<!-- Tabs Navigation -->
	<div class="flex border-b border-stone-300/40 dark:border-stone-700/40 gap-2">
		<button
			onclick={() => (activeTab = 'purchases')}
			class="px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 {activeTab ===
			'purchases'
				? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
				: 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900'}"
		>
			<ShoppingBag class="w-4 h-4" /> My Purchases ({purchases.length})
		</button>

		<button
			onclick={() => (activeTab = 'bids')}
			class="px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 {activeTab ===
			'bids'
				? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
				: 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900'}"
		>
			<Gavel class="w-4 h-4" /> My Bids ({myBids.length})
		</button>

		<button
			onclick={() => (activeTab = 'tracking')}
			class="px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 {activeTab ===
			'tracking'
				? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
				: 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900'}"
		>
			<Clock class="w-4 h-4" /> Order Tracking ({purchases.length + myBids.length})
		</button>
	</div>

	<!-- TAB 1: PURCHASES -->
	{#if activeTab === 'purchases'}
		{#if purchases.length === 0}
			<div
				class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-12 text-center"
			>
				<ShoppingBag class="w-12 h-12 text-stone-400 mx-auto mb-3" />
				<h3 class="text-lg font-bold text-stone-800 dark:text-stone-200 mb-1">
					No purchases or requests yet
				</h3>
				<p class="text-xs text-stone-500 dark:text-stone-400 mb-6">
					When you purchase products via Buy Now or Checkout, they will appear here.
				</p>
				<a
					href="/listings"
					class="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-700 transition-colors"
				>
					Explore Marketplace <ArrowRight class="w-3.5 h-3.5" />
				</a>
			</div>
		{:else}
			<div class="space-y-3">
				{#each purchases as order (order.id)}
					<div
						class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-4 sm:p-5 flex flex-wrap sm:flex-nowrap gap-4 items-center justify-between"
					>
						<!-- Left: Product Image & Details -->
						<div class="flex items-center gap-4 min-w-0">
							<a
								href={`/product/${order.slug}`}
								class="w-20 aspect-[4/3] rounded-xl overflow-hidden bg-stone-300 dark:bg-stone-700 shrink-0"
							>
								{#if order.image_url}
									<img
										src={order.image_url}
										alt={order.title}
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
									href={`/product/${order.slug}`}
									class="font-semibold text-stone-900 dark:text-stone-100 hover:underline line-clamp-1 text-sm sm:text-base"
								>
									{order.title}
								</a>
								<p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
									Seller: <span class="font-medium text-stone-700 dark:text-stone-300">@{order.seller_username}</span>
									• Ordered {new Date(order.created_at).toLocaleDateString()}
								</p>
								<div class="mt-2 text-base font-bold text-stone-900 dark:text-stone-100">
									₹{order.price.toLocaleString('en-IN')}
								</div>
							</div>
						</div>

						<!-- Right: Status Pill & Actions -->
						<div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200 dark:border-stone-700">
							<span
								class="px-3 py-1 text-xs font-semibold rounded-full border {STATUS_STYLES[
									order.status
								] ?? 'bg-stone-100 text-stone-700'}"
							>
								{order.status}
							</span>

							{#if order.status === 'Pending Seller Approval'}
								<form method="POST" action="?/cancelOrder" use:enhance>
									<input type="hidden" name="order_id" value={order.id} />
									<button
										type="submit"
										class="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
										title="Cancel this request"
									>
										Cancel Request
									</button>
								</form>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

	<!-- TAB 2: MY BIDS -->
	{:else if activeTab === 'bids'}
		{#if myBids.length === 0}
			<div
				class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-12 text-center"
			>
				<Gavel class="w-12 h-12 text-stone-400 mx-auto mb-3" />
				<h3 class="text-lg font-bold text-stone-800 dark:text-stone-200 mb-1">
					No active bids
				</h3>
				<p class="text-xs text-stone-500 dark:text-stone-400 mb-6">
					Bid on auction items to win rare products and great deals.
				</p>
				<a
					href="/listings?type=auction"
					class="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-700 transition-colors"
				>
					Browse Auctions <ArrowRight class="w-3.5 h-3.5" />
				</a>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each myBids as bid (bid.bid_id)}
					<div
						class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-5 space-y-3"
					>
						<div class="flex items-center gap-3">
							<a
								href={`/product/${bid.slug}`}
								class="w-16 aspect-[4/3] rounded-lg overflow-hidden bg-stone-300 dark:bg-stone-700 shrink-0"
							>
								{#if bid.image_url}
									<img src={bid.image_url} alt={bid.title} class="w-full h-full object-cover" />
								{:else}
									<div class="w-full h-full flex items-center justify-center text-xs text-stone-400">
										No img
									</div>
								{/if}
							</a>

							<div class="min-w-0 flex-1">
								<a
									href={`/product/${bid.slug}`}
									class="font-semibold text-stone-900 dark:text-stone-100 hover:underline line-clamp-1 text-sm"
								>
									{bid.title}
								</a>
								<div class="flex items-center gap-2 mt-1">
									{#if bid.is_winning}
										<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
											Winning
										</span>
									{:else}
										<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/30">
											Outbid
										</span>
									{/if}
									{#if bid.is_ended}
										<span class="text-[10px] text-stone-500">Ended</span>
									{/if}
								</div>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-2 p-3 rounded-xl bg-white/40 dark:bg-stone-800/40 text-xs">
							<div>
								<span class="text-stone-500 dark:text-stone-400 block">Your Latest Bid</span>
								<strong class="text-stone-900 dark:text-stone-100 font-bold">
									₹{bid.my_bid.toLocaleString('en-IN')}
								</strong>
							</div>
							<div>
								<span class="text-stone-500 dark:text-stone-400 block">Highest Bid</span>
								<strong class="text-indigo-600 dark:text-indigo-400 font-bold">
									₹{bid.current_highest.toLocaleString('en-IN')}
								</strong>
							</div>
						</div>

						<a
							href={`/product/${bid.slug}`}
							class="w-full py-2 rounded-xl bg-stone-200/60 dark:bg-stone-700/40 hover:bg-stone-300 dark:hover:bg-stone-600 text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center justify-center gap-1 transition-colors"
						>
							View Auction <ExternalLink class="w-3.5 h-3.5" />
						</a>
					</div>
				{/each}
			</div>
		{/if}

	<!-- TAB 3: ORDER TRACKING -->
	{:else if activeTab === 'tracking'}
		<div class="space-y-6">
			<!-- Filter Selector -->
			<div class="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-stone-200/50 dark:border-stone-700/50">
				<div class="flex items-center gap-2">
					<button
						onclick={() => (trackingFilter = 'all')}
						class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {trackingFilter ===
						'all'
							? 'bg-indigo-600 text-white shadow-xs'
							: 'bg-stone-200/60 dark:bg-stone-700/40 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600'}"
					>
						All Activity ({purchases.length + myBids.length})
					</button>
					<button
						onclick={() => (trackingFilter = 'orders')}
						class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {trackingFilter ===
						'orders'
							? 'bg-indigo-600 text-white shadow-xs'
							: 'bg-stone-200/60 dark:bg-stone-700/40 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600'}"
					>
						Purchase Requests ({purchases.length})
					</button>
					<button
						onclick={() => (trackingFilter = 'bids')}
						class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer {trackingFilter ===
						'bids'
							? 'bg-indigo-600 text-white shadow-xs'
							: 'bg-stone-200/60 dark:bg-stone-700/40 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600'}"
					>
						Auction Bids ({myBids.length})
					</button>
				</div>
			</div>

			<!-- Empty State when nothing to track -->
			{#if purchases.length === 0 && myBids.length === 0}
				<div
					class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-12 text-center"
				>
					<Clock class="w-12 h-12 text-stone-400 mx-auto mb-3" />
					<h3 class="text-lg font-bold text-stone-800 dark:text-stone-200 mb-1">
						No marketplace activity to track
					</h3>
					<p class="text-xs text-stone-500 dark:text-stone-400 mb-6">
						Submit a Buy Now request, checkout products, or place auction bids to track their fulfillment progression here.
					</p>
					<a
						href="/listings"
						class="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-700 transition-colors"
					>
						Explore Marketplace <ArrowRight class="w-3.5 h-3.5" />
					</a>
				</div>
			{:else}
				<div class="space-y-5">
					<!-- SECTION 1: Tracked Purchases / Orders -->
					{#if (trackingFilter === 'all' || trackingFilter === 'orders') && purchases.length > 0}
						<div class="space-y-4">
							{#if trackingFilter === 'all'}
								<h3 class="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
									<ShoppingBag class="w-3.5 h-3.5 text-indigo-500" />
									Purchase Requests ({purchases.length})
								</h3>
							{/if}

							{#each purchases as order (order.id)}
								<div
									class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-5 md:p-6 space-y-5"
								>
									<!-- Order Header: ID & Status Pill -->
									<div class="flex flex-wrap items-center justify-between gap-3 border-b border-stone-300/40 dark:border-stone-700/40 pb-3">
										<div>
											<span class="text-xs font-mono text-stone-500 dark:text-stone-400 block">
												Order #{order.id.slice(0, 8)}
											</span>
											<span class="text-xs text-stone-400">
												Placed on {new Date(order.created_at).toLocaleDateString([], {
													day: 'numeric',
													month: 'short',
													year: 'numeric',
													hour: '2-digit',
													minute: '2-digit'
												})}
											</span>
										</div>

										<div class="flex items-center gap-2">
											<span
												class="px-3 py-1 text-xs font-bold rounded-full border {STATUS_STYLES[
													order.status
												] ?? 'bg-stone-100 text-stone-700'}"
											>
												{order.status}
											</span>
										</div>
									</div>

									<!-- Order Item Details -->
									<div class="flex items-center gap-4">
										<a
											href={`/product/${order.slug}`}
											class="w-16 sm:w-20 aspect-[4/3] rounded-xl overflow-hidden bg-stone-300 dark:bg-stone-700 shrink-0"
										>
											{#if order.image_url}
												<img
													src={order.image_url}
													alt={order.title}
													class="w-full h-full object-cover"
												/>
											{:else}
												<div class="w-full h-full flex items-center justify-center text-xs text-stone-400">
													No img
												</div>
											{/if}
										</a>

										<div class="min-w-0 flex-1">
											<a
												href={`/product/${order.slug}`}
												class="font-semibold text-stone-900 dark:text-stone-100 hover:underline line-clamp-1 text-sm sm:text-base"
											>
												{order.title}
											</a>
											<p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
												Seller: <span class="font-medium text-stone-700 dark:text-stone-300">@{order.seller_username}</span>
											</p>
											<span class="text-base font-bold text-stone-900 dark:text-stone-100 mt-1 block">
												₹{order.price.toLocaleString('en-IN')}
											</span>
										</div>
									</div>

									<!-- 3-Step Interactive Tracking Progression Stepper -->
									<div class="pt-2">
										<div class="grid grid-cols-3 gap-2 text-center text-xs relative">
											<!-- Connecting Line -->
											<div class="absolute top-4 left-[16%] right-[16%] h-0.5 bg-stone-300 dark:bg-stone-700 -z-0">
												<div
													class="h-full bg-indigo-600 transition-all duration-500"
													style="width: {order.status === 'Accepted' || order.status === 'Delivered' ? '100%' : order.status === 'Pending Seller Approval' ? '50%' : '0%'}"
												></div>
											</div>

											<!-- Step 1 -->
											<div class="flex flex-col items-center relative z-10">
												<div class="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center mb-1.5 shadow-sm">
													<CheckCircle2 class="w-4 h-4" />
												</div>
												<strong class="text-stone-900 dark:text-stone-100 font-semibold">Request Sent</strong>
												<span class="text-[10px] text-stone-400">Submitted</span>
											</div>

											<!-- Step 2 -->
											<div class="flex flex-col items-center relative z-10">
												<div
													class="w-8 h-8 rounded-full font-bold flex items-center justify-center mb-1.5 shadow-sm {order.status ===
													'Pending Seller Approval'
														? 'bg-amber-500 text-white animate-pulse'
														: order.status === 'Accepted' || order.status === 'Delivered'
															? 'bg-emerald-500 text-white'
															: order.status === 'Rejected'
																? 'bg-rose-500 text-white'
																: 'bg-stone-300 dark:bg-stone-700 text-stone-600 dark:text-stone-400'}"
												>
													{#if order.status === 'Accepted' || order.status === 'Delivered'}
														<CheckCircle2 class="w-4 h-4" />
													{:else if order.status === 'Rejected'}
														<XCircle class="w-4 h-4" />
													{:else}
														<Clock class="w-4 h-4" />
													{/if}
												</div>
												<strong class="text-stone-900 dark:text-stone-100 font-semibold">Seller Review</strong>
												<span class="text-[10px] text-stone-400">
													{order.status === 'Pending Seller Approval' ? 'Pending Approval' : order.status === 'Rejected' ? 'Declined' : 'Reviewed'}
												</span>
											</div>

											<!-- Step 3 -->
											<div class="flex flex-col items-center relative z-10">
												<div
													class="w-8 h-8 rounded-full font-bold flex items-center justify-center mb-1.5 shadow-sm {order.status ===
													'Accepted' || order.status === 'Delivered'
														? 'bg-emerald-500 text-white'
														: order.status === 'Rejected'
															? 'bg-rose-500 text-white'
															: 'bg-stone-300 dark:bg-stone-700 text-stone-600 dark:text-stone-400'}"
												>
													{#if order.status === 'Accepted' || order.status === 'Delivered'}
														<PackageCheck class="w-4 h-4" />
													{:else if order.status === 'Rejected'}
														<Ban class="w-4 h-4" />
													{:else}
														<FileText class="w-4 h-4" />
													{/if}
												</div>
												<strong class="text-stone-900 dark:text-stone-100 font-semibold">
													{order.status === 'Rejected' ? 'Declined' : 'Confirmed'}
												</strong>
												<span class="text-[10px] text-stone-400">
													{order.status === 'Accepted' ? 'Item Reserved' : order.status === 'Rejected' ? 'Request Rejected' : 'Awaiting Approval'}
												</span>
											</div>
										</div>
									</div>

									<!-- Explanatory note -->
									<div class="p-3 rounded-xl bg-white/40 dark:bg-stone-800/40 text-xs text-stone-600 dark:text-stone-400 flex items-center gap-2">
										{#if order.status === 'Pending Seller Approval'}
											<Clock class="w-4 h-4 text-amber-500 shrink-0" />
											<span>Under seller review. You have not been charged.</span>
										{:else if order.status === 'Accepted'}
											<CheckCircle2 class="w-4 h-4 text-emerald-500 shrink-0" />
											<span class="text-emerald-700 dark:text-emerald-300 font-medium">
												Purchase approved! The seller accepted your request and the product is reserved.
											</span>
										{:else if order.status === 'Rejected'}
											<XCircle class="w-4 h-4 text-rose-500 shrink-0" />
											<span class="text-rose-600 dark:text-rose-400">
												The seller was unable to fulfill this request. No funds were transferred.
											</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}

					<!-- SECTION 2: Tracked Auction Bids -->
					{#if (trackingFilter === 'all' || trackingFilter === 'bids') && myBids.length > 0}
						<div class="space-y-4">
							{#if trackingFilter === 'all'}
								<h3 class="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5 pt-2">
									<Gavel class="w-3.5 h-3.5 text-indigo-500" />
									Auction Bids ({myBids.length})
								</h3>
							{/if}

							{#each myBids as bid (bid.bid_id)}
								<div
									class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-5 md:p-6 space-y-5"
								>
									<!-- Bid Header: ID & Status Pill -->
									<div class="flex flex-wrap items-center justify-between gap-3 border-b border-stone-300/40 dark:border-stone-700/40 pb-3">
										<div>
											<span class="text-xs font-mono text-stone-500 dark:text-stone-400 block">
												Bid #{bid.bid_id.slice(0, 8)}
											</span>
											<span class="text-xs text-stone-400">
												Auction ends: {bid.end_date ? new Date(bid.end_date).toLocaleDateString([], {
													day: 'numeric',
													month: 'short',
													year: 'numeric'
												}) : 'Ongoing'}
											</span>
										</div>

										<div class="flex items-center gap-2">
											{#if bid.status === 'won' || (bid.is_winning && bid.is_ended)}
												<span class="px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
													🎉 Auction Won • Reserved
												</span>
											{:else if bid.is_winning}
												<span class="px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
													Leading Bidder
												</span>
											{:else if !bid.is_winning && !bid.is_ended}
												<span class="px-3 py-1 text-xs font-bold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
													Outbid
												</span>
											{:else}
												<span class="px-3 py-1 text-xs font-bold rounded-full bg-stone-500/10 text-stone-600 dark:text-stone-400 border border-stone-500/30">
													Auction Ended
												</span>
											{/if}
										</div>
									</div>

									<!-- Bid Item Details -->
									<div class="flex items-center gap-4">
										<a
											href={`/product/${bid.slug}`}
											class="w-16 sm:w-20 aspect-[4/3] rounded-xl overflow-hidden bg-stone-300 dark:bg-stone-700 shrink-0"
										>
											{#if bid.image_url}
												<img
													src={bid.image_url}
													alt={bid.title}
													class="w-full h-full object-cover"
												/>
											{:else}
												<div class="w-full h-full flex items-center justify-center text-xs text-stone-400">
													No img
												</div>
											{/if}
										</a>

										<div class="min-w-0 flex-1">
											<a
												href={`/product/${bid.slug}`}
												class="font-semibold text-stone-900 dark:text-stone-100 hover:underline line-clamp-1 text-sm sm:text-base"
											>
												{bid.title}
											</a>
											<div class="flex flex-wrap items-center gap-4 mt-1.5 text-xs">
												<div>
													<span class="text-stone-400">Your Bid:</span>
													<strong class="text-stone-900 dark:text-stone-100 font-bold ml-1">
														₹{bid.my_bid.toLocaleString('en-IN')}
													</strong>
												</div>
												<div>
													<span class="text-stone-400">Current Highest:</span>
													<strong class="text-indigo-600 dark:text-indigo-400 font-bold ml-1">
														₹{bid.current_highest.toLocaleString('en-IN')}
													</strong>
												</div>
											</div>
										</div>

										<div class="hidden sm:block shrink-0">
											{#if !bid.is_winning && !bid.is_ended}
												<a
													href={`/product/${bid.slug}`}
													class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
												>
													Raise Bid <ArrowRight class="w-3.5 h-3.5" />
												</a>
											{:else}
												<a
													href={`/product/${bid.slug}`}
													class="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center gap-1.5"
												>
													View Auction <ExternalLink class="w-3.5 h-3.5" />
												</a>
											{/if}
										</div>
									</div>

									<!-- 3-Step Bid Progression Stepper -->
									<div class="pt-2">
										<div class="grid grid-cols-3 gap-2 text-center text-xs relative">
											<!-- Connecting Line -->
											<div class="absolute top-4 left-[16%] right-[16%] h-0.5 bg-stone-300 dark:bg-stone-700 -z-0">
												<div
													class="h-full bg-indigo-600 transition-all duration-500"
													style="width: {bid.status === 'won' || (bid.is_winning && bid.is_ended) ? '100%' : '50%'}"
												></div>
											</div>

											<!-- Step 1 -->
											<div class="flex flex-col items-center relative z-10">
												<div class="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center mb-1.5 shadow-sm">
													<CheckCircle2 class="w-4 h-4" />
												</div>
												<strong class="text-stone-900 dark:text-stone-100 font-semibold">Bid Placed</strong>
												<span class="text-[10px] text-stone-400">₹{bid.my_bid.toLocaleString('en-IN')}</span>
											</div>

											<!-- Step 2 -->
											<div class="flex flex-col items-center relative z-10">
												<div
													class="w-8 h-8 rounded-full font-bold flex items-center justify-center mb-1.5 shadow-sm {bid.status === 'won' || bid.is_winning
														? 'bg-emerald-500 text-white'
														: 'bg-rose-500 text-white'}"
												>
													{#if bid.status === 'won' || bid.is_winning}
														<CheckCircle2 class="w-4 h-4" />
													{:else}
														<AlertCircle class="w-4 h-4" />
													{/if}
												</div>
												<strong class="text-stone-900 dark:text-stone-100 font-semibold">
													{bid.status === 'won' ? 'Winning Bid' : bid.is_winning ? 'Highest Bidder' : 'Outbid'}
												</strong>
												<span class="text-[10px] text-stone-400">
													{bid.is_winning ? 'Currently Leading' : 'Higher Bid Placed'}
												</span>
											</div>

											<!-- Step 3 -->
											<div class="flex flex-col items-center relative z-10">
												<div
													class="w-8 h-8 rounded-full font-bold flex items-center justify-center mb-1.5 shadow-sm {bid.status === 'won' || (bid.is_winning && bid.is_ended)
														? 'bg-emerald-500 text-white'
														: bid.is_ended
															? 'bg-stone-400 text-white'
															: 'bg-stone-300 dark:bg-stone-700 text-stone-600 dark:text-stone-400'}"
												>
													{#if bid.status === 'won' || (bid.is_winning && bid.is_ended)}
														<PackageCheck class="w-4 h-4" />
													{:else if bid.is_ended}
														<XCircle class="w-4 h-4" />
													{:else}
														<Clock class="w-4 h-4" />
													{/if}
												</div>
												<strong class="text-stone-900 dark:text-stone-100 font-semibold">
													{bid.status === 'won' || (bid.is_winning && bid.is_ended) ? 'Won & Reserved' : bid.is_ended ? 'Auction Closed' : 'Auction Active'}
												</strong>
												<span class="text-[10px] text-stone-400">
													{bid.status === 'won' ? 'Item Reserved' : bid.is_ended ? 'Concluded' : 'In Progress'}
												</span>
											</div>
										</div>
									</div>

									<!-- Explanatory note -->
									<div class="p-3 rounded-xl bg-white/40 dark:bg-stone-800/40 text-xs text-stone-600 dark:text-stone-400 flex items-center justify-between gap-3">
										<div class="flex items-center gap-2">
											{#if bid.status === 'won' || (bid.is_winning && bid.is_ended)}
												<CheckCircle2 class="w-4 h-4 text-emerald-500 shrink-0" />
												<span class="text-emerald-700 dark:text-emerald-300 font-medium">
													🎉 You won this auction! The seller accepted your bid and the product is reserved for you.
												</span>
											{:else if bid.is_winning}
												<CheckCircle2 class="w-4 h-4 text-emerald-500 shrink-0" />
												<span>You are currently the leading bidder. Keep an eye on incoming bids.</span>
											{:else if !bid.is_winning && !bid.is_ended}
												<AlertCircle class="w-4 h-4 text-rose-500 shrink-0" />
												<span class="text-rose-600 dark:text-rose-400 font-medium">
													You have been outbid! Raise your bid now to take back the lead.
												</span>
											{:else}
												<Clock class="w-4 h-4 text-stone-400 shrink-0" />
												<span>This auction has ended.</span>
											{/if}
										</div>

										<div class="sm:hidden shrink-0">
											<a
												href={`/product/${bid.slug}`}
												class="text-xs font-semibold text-indigo-600 hover:underline"
											>
												View →
											</a>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Explanatory Guidelines Footer -->
			<div
				class="backdrop-blur-lg bg-stone-200/20 dark:bg-stone-800/20 rounded-2xl border border-white/20 dark:border-gray-700/20 p-5 space-y-3"
			>
				<h4 class="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
					<FileText class="w-3.5 h-3.5 text-indigo-500" />
					How Marketplace Tracking Works
				</h4>
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-stone-500 dark:text-stone-400">
					<div>
						<strong class="block text-stone-800 dark:text-stone-200 mb-0.5">1. Buy Now & Bids</strong>
						Purchases start as "Pending Seller Approval" while bids remain live throughout the auction.
					</div>
					<div>
						<strong class="block text-stone-800 dark:text-stone-200 mb-0.5">2. Seller Decision</strong>
						Sellers review purchase requests and can choose to close bidding early to sell to the top bidder.
					</div>
					<div>
						<strong class="block text-stone-800 dark:text-stone-200 mb-0.5">3. Reservation</strong>
						Once approved or won, orders transition to Accepted and items are reserved for fulfillment.
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
