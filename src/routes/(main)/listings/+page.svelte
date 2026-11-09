<script lang="ts">
	import ProductCard from '$lib/components/ProductCard.svelte';
	import { X, SlidersHorizontal, Tag, Search } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	let { data } = $props();

	let searchValue = $state('');
	let sortValue = $state('recent');
	let showFilters = $state(false);

	$effect(() => {
		searchValue = data.search ?? '';
		sortValue = data.sort ?? 'recent';
	});

	const SORT_OPTIONS = [
		{ value: 'recent', label: 'Most Recent' },
		{ value: 'ending_soon', label: 'Ending Soon' },
		{ value: 'price_asc', label: 'Price: Low → High' },
		{ value: 'price_desc', label: 'Price: High → Low' }
	];

	const CONDITIONS = [
		{ value: 'brand_new', label: 'Brand new' },
		{ value: 'like_new', label: 'Like new' },
		{ value: 'open_box', label: 'Open box' },
		{ value: 'used_good', label: 'Good' },
		{ value: 'used_fair', label: 'Fair' },
		{ value: 'for_parts', label: 'Poor / for parts' }
	];

	const LISTING_TYPES = [
		{ value: 'all', label: 'All Listings' },
		{ value: 'auction', label: 'Auctions Only' },
		{ value: 'buy_now', label: 'Buy It Now Only' }
	];

	let activeFilterCount = $derived(
		(data.search ? 1 : 0) +
			(data.category ? 1 : 0) +
			(data.conditions?.length ?? 0) +
			(data.min != null ? 1 : 0) +
			(data.max != null ? 1 : 0) +
			(data.listingType !== 'all' ? 1 : 0)
	);

	function pageHref(p: number) {
		const params = new SvelteURLSearchParams();
		if (data.search) params.set('q', data.search);
		if (data.sort && data.sort !== 'recent') params.set('sort', data.sort);
		if (data.category) params.set('category', data.category);
		if (data.min != null) params.set('min', String(data.min));
		if (data.max != null) params.set('max', String(data.max));
		if (data.listingType && data.listingType !== 'all') params.set('type', data.listingType);
		if (data.conditions?.length) {
			for (const c of data.conditions) params.append('condition', c);
		}
		if (p > 1) params.set('page', String(p));
		return `/listings?${params.toString()}`;
	}

	let totalPages = $derived(Math.ceil((data.count ?? 0) / (data.pageSize || 20)));
	let listings = $derived((data.listings ?? []) as any[]);

	const card =
		'backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-5 md:p-8';
	const input =
		'w-full rounded-xl border border-stone-300/50 bg-white/50 px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 dark:border-stone-600/50 dark:bg-stone-700/40 dark:text-stone-50';
	const label =
		'mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400';
</script>

<svelte:head>
	<title>Browse Listings | PALMYRA</title>
</svelte:head>

<div class="grid gap-6 lg:grid-cols-[17rem_1fr] lg:items-start">
	<!-- Mobile toggle -->
	<button
		type="button"
		onclick={() => (showFilters = !showFilters)}
		class="{card} flex items-center justify-between px-5 py-3 text-sm font-medium text-stone-800 lg:hidden dark:text-stone-100"
		aria-expanded={showFilters}
	>
		<span class="flex items-center gap-2">
			<SlidersHorizontal class="h-4 w-4" /> Filters
			{#if activeFilterCount > 0}
				<span class="rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">
					{activeFilterCount}
				</span>
			{/if}
		</span>
		<span class="text-xs text-stone-500">{showFilters ? 'Hide' : 'Show'}</span>
	</button>

	<!-- Filter Sidebar -->
	<aside class="{card} p-5 lg:sticky lg:top-4 {showFilters ? 'block' : 'hidden'} lg:block">
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-lg font-bold text-stone-800 dark:text-stone-100">Filters</h2>
			{#if activeFilterCount > 0}
				<a href="/listings" class="flex items-center gap-1 text-xs text-rose-500 hover:underline">
					<X class="h-3.5 w-3.5" /> Clear all
				</a>
			{/if}
		</div>

		<form
			method="GET"
			action="/listings"
			data-sveltekit-keepfocus
			data-sveltekit-noscroll
			onchange={(e) => e.currentTarget.requestSubmit()}
			class="space-y-5"
		>
			<!-- Keyword search -->
			{#if data.search}
				<input type="hidden" name="q" value={data.search} />
			{/if}

			<!-- Sort -->
			<div>
				<label class={label} for="sort">Sort by</label>
				<select id="sort" name="sort" class={input}>
					{#each SORT_OPTIONS as opt (opt.value)}
						<option value={opt.value} selected={data.sort === opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>

			<!-- Category Filter -->
			{#if data.categories?.length}
				<div>
					<label class={label} for="category">Category</label>
					<select id="category" name="category" class={input}>
						<option value="">All Categories</option>
						{#each data.categories as cat (cat.id)}
							<option value={cat.slug} selected={data.category === cat.slug}>
								{cat.name}
							</option>
						{/each}
					</select>
				</div>
			{/if}

			<!-- Listing Type -->
			<div>
				<label class={label} for="type">Listing Type</label>
				<select id="type" name="type" class={input}>
					{#each LISTING_TYPES as lt (lt.value)}
						<option value={lt.value} selected={data.listingType === lt.value}>
							{lt.label}
						</option>
					{/each}
				</select>
			</div>

			<!-- Condition -->
			<fieldset>
				<legend class={label}>Condition</legend>
				<div class="space-y-1.5 max-h-40 overflow-y-auto">
					{#each CONDITIONS as c (c.value)}
						<label class="flex cursor-pointer items-center gap-2 text-sm text-stone-700 dark:text-stone-200">
							<input
								type="checkbox"
								name="condition"
								value={c.value}
								checked={data.conditions?.includes(c.value) ?? false}
								class="h-4 w-4 rounded accent-indigo-600"
							/>
							{c.label}
						</label>
					{/each}
				</div>
			</fieldset>

			<!-- Price Range -->
			<fieldset>
				<legend class={label}>Price (₹)</legend>
				<div class="flex items-center gap-2">
					<input
						name="min"
						type="number"
						min="0"
						inputmode="numeric"
						placeholder="Min"
						value={data.min ?? ''}
						class={input}
					/>
					<span class="text-stone-400">–</span>
					<input
						name="max"
						type="number"
						min="0"
						inputmode="numeric"
						placeholder="Max"
						value={data.max ?? ''}
						class={input}
					/>
				</div>
			</fieldset>

			<!-- Apply button for non-JS/enter -->
			<button
				type="submit"
				class="w-full rounded-xl bg-stone-800 py-2.5 text-sm font-semibold text-stone-100 hover:opacity-90 dark:bg-stone-100 dark:text-stone-800 transition-opacity"
			>
				Apply Filters
			</button>
		</form>
	</aside>

	<!-- Main Listings Area -->
	<section class="{card} min-w-0 p-5 md:p-8">
		<div class="flex flex-wrap items-center justify-between gap-3 mb-6">
			<div>
				<h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">
					{#if data.category}
						Category: <span class="capitalize">{data.category.replace('-', ' ')}</span>
					{:else if data.search}
						Search: "{data.search}"
					{:else}
						Marketplace Listings
					{/if}
				</h1>
				<p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
					Showing {listings.length} of {data.count} available products
				</p>
			</div>

			{#if data.search}
				<a
					href="/listings"
					class="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1"
				>
					<X class="w-3.5 h-3.5" /> Clear search
				</a>
			{/if}
		</div>

		<!-- Grid of Products -->
		{#if listings.length === 0}
			<div class="text-center py-20 text-stone-400 dark:text-stone-500">
				<p class="text-lg font-medium mb-2">No matching listings found</p>
				<p class="text-sm mb-4">Try adjusting your filters or search terms.</p>
				<a
					href="/sell"
					class="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors"
				>
					+ Create a Listing
				</a>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
				{#each listings as product (product.id)}
					<ProductCard {product} />
				{/each}
			</div>
		{/if}

		<!-- Pagination -->
		{#if totalPages > 1}
			<nav class="mt-8 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
				{#if data.page > 1}
					<a
						href={pageHref(data.page - 1)}
						class="rounded-xl bg-stone-200/60 px-4 py-2.5 text-stone-700 dark:bg-stone-700/40 dark:text-stone-300 hover:bg-stone-300 transition-colors"
					>
						← Prev
					</a>
				{/if}
				<span class="text-stone-500 dark:text-stone-400 font-medium">
					Page {data.page} of {totalPages}
				</span>
				{#if data.page < totalPages}
					<a
						href={pageHref(data.page + 1)}
						class="rounded-xl bg-stone-200/60 px-4 py-2.5 text-stone-700 dark:bg-stone-700/40 dark:text-stone-300 hover:bg-stone-300 transition-colors"
					>
						Next →
					</a>
				{/if}
			</nav>
		{/if}
	</section>
</div>
