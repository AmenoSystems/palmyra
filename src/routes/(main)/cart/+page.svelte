<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		ShoppingCart,
		Trash2,
		ArrowRight,
		ArrowLeft,
		CheckCircle2,
		AlertCircle,
		ShieldCheck,
		Package
	} from 'lucide-svelte';
	import { getLocalCart, removeFromCart, clearCart, type CartItem } from '$lib/cart';
	import { addLocalOrder } from '$lib/orders';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	// Merge server items with local storage items
	let items = $state<any[]>([]);
	let isCheckingOut = $state(false);

	$effect(() => {
		if (data.cartItems && data.cartItems.length > 0) {
			items = data.cartItems;
		} else {
			// fallback to local storage
			const local = getLocalCart();
			items = local.map((l) => ({
				cart_item_id: l.id,
				listing_id: l.listing_id,
				title: l.title,
				slug: l.slug,
				price: l.price,
				image_url: l.image_url,
				seller_id: l.seller_id,
				seller_username: l.seller_username ?? 'Seller',
				quantity: l.quantity ?? 1
			}));
		}
	});

	let subtotal = $derived(
		items.reduce((sum, item) => sum + Number(item.price || 0) * (item.quantity || 1), 0)
	);

	async function handleRemoveLocal(listingId: string) {
		await removeFromCart(listingId);
		items = items.filter((i) => i.listing_id !== listingId);
		await invalidateAll();
	}

	$effect(() => {
		if (form?.checkoutSuccess) {
			clearCart();
			items = [];
		}
	});
</script>

<svelte:head>
	<title>Shopping Cart | PALMYRA</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<a
				href="/listings"
				class="p-2 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition-colors text-stone-700 dark:text-stone-300"
				aria-label="Back to listings"
			>
				<ArrowLeft class="w-5 h-5" />
			</a>
			<div>
				<h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
					<ShoppingCart class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
					Your Shopping Cart
				</h1>
				<p class="text-xs text-stone-500 dark:text-stone-400">
					{items.length} {items.length === 1 ? 'item' : 'items'} in your cart
				</p>
			</div>
		</div>

		<a
			href="/listings"
			class="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
		>
			Continue Shopping <ArrowRight class="w-3.5 h-3.5" />
		</a>
	</div>

	<!-- Status Notifications -->
	{#if form?.message}
		<div
			class="p-4 rounded-2xl text-sm flex items-start gap-3 {form?.success
				? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
				: 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400'}"
		>
			{#if form?.success}
				<CheckCircle2 class="w-5 h-5 shrink-0 mt-0.5" />
			{:else}
				<AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
			{/if}
			<div>
				<strong class="font-semibold block">{form?.success ? 'Order Placed' : 'Notice'}</strong>
				<span>{form.message}</span>
				{#if form?.checkoutSuccess}
					<div class="mt-3">
						<a
							href="/dashboard/buyer"
							class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
						>
							View in Buyer Dashboard <ArrowRight class="w-3.5 h-3.5" />
						</a>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if items.length === 0}
		<!-- Empty State -->
		<div
			class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-12 text-center"
		>
			<div class="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-300/40 dark:bg-stone-700/40 flex items-center justify-center text-stone-500 dark:text-stone-400">
				<ShoppingCart class="w-8 h-8" />
			</div>
			<h2 class="text-xl font-bold text-stone-800 dark:text-stone-200 mb-2">Your cart is empty</h2>
			<p class="text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto mb-6">
				Looks like you haven't added any products to your cart yet. Explore our marketplace to find great deals!
			</p>
			<a
				href="/listings"
				class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-lg"
			>
				Browse Listings <ArrowRight class="w-4 h-4" />
			</a>
		</div>
	{:else}
		<!-- Cart Items Grid / List -->
		<div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
			<!-- Items List -->
			<div class="space-y-3">
				{#each items as item (item.listing_id || item.cart_item_id)}
					<div
						class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/30 p-4 sm:p-5 flex gap-4 items-center"
					>
						<!-- Image -->
						<a
							href={`/product/${item.slug}`}
							class="w-24 aspect-[4/3] rounded-xl overflow-hidden bg-stone-300 dark:bg-stone-700 shrink-0"
						>
							{#if item.image_url}
								<img
									src={item.image_url}
									alt={item.title}
									class="w-full h-full object-cover"
									loading="lazy"
								/>
							{:else}
								<div class="w-full h-full flex items-center justify-center text-xs text-stone-400">
									No img
								</div>
							{/if}
						</a>

						<!-- Info -->
						<div class="flex-1 min-w-0">
							<a
								href={`/product/${item.slug}`}
								class="font-semibold text-stone-900 dark:text-stone-100 hover:underline line-clamp-1 text-sm sm:text-base"
							>
								{item.title}
							</a>
							<p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
								Sold by <span class="text-stone-700 dark:text-stone-300 font-medium">@{item.seller_username}</span>
							</p>

							<div class="flex items-center justify-between mt-3">
								<span class="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
									₹{Number(item.price).toLocaleString('en-IN')}
								</span>

								<!-- Remove Action -->
								<form
									method="POST"
									action="?/remove"
									use:enhance={() => {
										handleRemoveLocal(item.listing_id);
										return async ({ update }) => update();
									}}
								>
									<input type="hidden" name="listing_id" value={item.listing_id} />
									<button
										type="submit"
										class="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
									>
										<Trash2 class="w-3.5 h-3.5" /> Remove
									</button>
								</form>
							</div>
						</div>
					</div>
				{/each}

				<div class="pt-2">
					<a
						href="/listings"
						class="inline-flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-medium"
					>
						<ArrowLeft class="w-3.5 h-3.5" /> Continue Shopping
					</a>
				</div>
			</div>

			<!-- Order Summary & Checkout Card -->
			<div class="space-y-4">
				<div
					class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-6 space-y-4"
				>
					<h3 class="font-bold text-stone-900 dark:text-stone-100 text-lg">Order Summary</h3>

					<div class="space-y-2 text-sm text-stone-600 dark:text-stone-300 border-b border-stone-300/40 dark:border-stone-700/40 pb-4">
						<div class="flex justify-between">
							<span>Items ({items.length})</span>
							<strong class="font-semibold text-stone-900 dark:text-stone-100">
								₹{subtotal.toLocaleString('en-IN')}
							</strong>
						</div>
						<div class="flex justify-between text-xs text-stone-500 dark:text-stone-400">
							<span>Seller Approval</span>
							<span class="text-emerald-600 font-medium">Required</span>
						</div>
					</div>

					<div class="flex justify-between text-lg font-extrabold text-stone-900 dark:text-stone-50">
						<span>Total Value</span>
						<span>₹{subtotal.toLocaleString('en-IN')}</span>
					</div>

					<!-- Checkout Form -->
					<form
						method="POST"
						action="?/checkout"
						use:enhance={() => {
							isCheckingOut = true;
							return async ({ update, result }) => {
								if (result.type === 'success' && (result.data as any)?.checkoutSuccess) {
									const fallbackOrders = (result.data as any)?.fallbackOrders;
									if (fallbackOrders && Array.isArray(fallbackOrders)) {
										for (const fo of fallbackOrders) {
											addLocalOrder(fo);
										}
									}
									clearCart();
									items = [];
								}
								await update();
								isCheckingOut = false;
							};
						}}
					>
						<input type="hidden" name="cart_items_json" value={JSON.stringify(items)} />
						<button
							type="submit"
							disabled={isCheckingOut || items.length === 0}
							class="w-full py-3.5 rounded-xl bg-linear-to-r from-indigo-600 to-rose-600 hover:opacity-95 text-white font-semibold text-sm transition-all shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
						>
							{#if isCheckingOut}
								<span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
								Submitting Purchase Requests...
							{:else}
								Proceed to Checkout <ArrowRight class="w-4 h-4" />
							{/if}
						</button>
					</form>

					<p class="text-[11px] text-stone-500 dark:text-stone-400 text-center leading-normal">
						By proceeding, purchase requests will be submitted to respective seller(s). No payments are collected until accepted.
					</p>
				</div>

				<div
					class="p-4 rounded-xl bg-stone-200/20 dark:bg-stone-800/20 border border-white/20 dark:border-stone-700/20 text-xs text-stone-600 dark:text-stone-400 flex items-start gap-2.5"
				>
					<ShieldCheck class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
					<span>Each order is routed directly to the seller for approval before fulfillment.</span>
				</div>
			</div>
		</div>
	{/if}
</div>
