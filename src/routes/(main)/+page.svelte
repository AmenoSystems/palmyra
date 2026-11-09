<script lang="ts">
	import ProductCard from '$lib/components/ProductCard.svelte';
	import { Maximize2, TrendingUp, Clock, PlusCircle } from 'lucide-svelte';

	let { data } = $props();

	let featured = $derived((data.featured ?? []) as any[]);
	let recent = $derived((data.recent ?? []) as any[]);
</script>

<svelte:head>
	<title>PALMYRA — Marketplace & Auctions</title>
</svelte:head>

<!-- Featured Listings -->
<div class="mb-6 backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-6 md:p-8">
	<div class="text-stone-800 dark:text-gray-300">
		<div class="mb-4 flex items-center justify-between">
			<a href="/listings?sort=price_desc" class="text-2xl font-bold hover:underline flex items-center gap-2">
				<TrendingUp class="w-5 h-5 text-indigo-500" />
				Featured Listings
			</a>
			<a
				href="/listings"
				class="hidden md:flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
			>
				<span>View all</span>
				<Maximize2 class="w-4 h-4 ml-1" />
			</a>
		</div>

		{#if featured.length === 0}
			<div class="text-center py-12 text-stone-500 dark:text-stone-400">
				<p class="text-base mb-2">No active listings yet.</p>
				<a href="/sell" class="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
					<PlusCircle class="w-4 h-4" /> Be the first to sell!
				</a>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each featured as product (product.id)}
					<ProductCard {product} />
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Recent Listings -->
<div class="mb-6 backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-6 md:p-8">
	<div class="text-stone-800 dark:text-gray-300">
		<div class="mb-4 flex items-center justify-between">
			<a href="/listings?sort=recent" class="text-2xl font-bold hover:underline flex items-center gap-2">
				<Clock class="w-5 h-5 text-rose-500" />
				Recently Listed
			</a>
			<a
				href="/listings"
				class="hidden md:flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
			>
				<span>View all</span>
				<Maximize2 class="w-4 h-4 ml-1" />
			</a>
		</div>

		{#if recent.length === 0}
			<div class="text-center py-12 text-stone-500 dark:text-stone-400">
				<p class="text-base mb-2">No recently listed items.</p>
				<a href="/sell" class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
					Start selling now
				</a>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each recent as product (product.id)}
					<ProductCard {product} />
				{/each}
			</div>
		{/if}
	</div>
</div>
