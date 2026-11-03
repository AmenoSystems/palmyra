<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let {
		activeCategory = $bindable(''),
		mobileOpen = $bindable(false)
	} = $props();

	const categories = [
		{ id: 'electronics', label: 'Electronics' },
		{ id: 'fashion', label: 'Fashion' },
		{ id: 'home-living', label: 'Home & Living' },
		{ id: 'sports', label: 'Sports' },
		{ id: 'books', label: 'Books' },
		{ id: 'collectibles', label: 'Collectibles' },
		{ id: 'automotive', label: 'Automotive' },
		{ id: 'art-crafts', label: 'Art & Crafts' }
	];

	// Keep activeCategory synced with URL if on /listings
	$effect(() => {
		const urlCat = $page.url.searchParams.get('category');
		if (urlCat) {
			activeCategory = urlCat;
		}
	});

	function select(categoryId: string) {
		activeCategory = categoryId;
		mobileOpen = false;
		goto(`/listings?category=${encodeURIComponent(categoryId)}`);
	}
</script>

<div class="hidden md:block overflow-x-auto scrollbar-hide py-2">
	<div class="flex gap-2 min-w-max px-4">
		{#each categories as category (category.id)}
			<button
				onclick={() => select(category.id)}
				class={`
					px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer
					${activeCategory === category.id || (category.id === 'home-living' && activeCategory === 'home')
						? 'bg-stone-800 text-white dark:bg-gray-100 dark:text-stone-800 shadow-sm'
						: 'bg-stone-200/70 text-stone-700 hover:bg-stone-300/70 dark:bg-stone-500/50 dark:text-gray-300 dark:hover:bg-stone-600/50'
					}
				`}
			>
				{category.label}
			</button>
		{/each}
	</div>
</div>

<div 
	class={`
		md:hidden overflow-hidden transition-all duration-300 ease-in-out
		${mobileOpen ? 'max-h-125 opacity-100 py-2' : 'max-h-0 opacity-0 py-0'}
	`}
>
	<div class="flex flex-wrap gap-2 px-4">
		{#each categories as category (category.id)}
			<button
				onclick={() => select(category.id)}
				class={`
					px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer
					${activeCategory === category.id || (category.id === 'home-living' && activeCategory === 'home')
						? 'bg-stone-800 text-white dark:bg-gray-100 dark:text-stone-800 shadow-sm'
						: 'bg-stone-200/70 text-stone-700 hover:bg-stone-300/70 dark:bg-stone-700/50 dark:text-gray-300 dark:hover:bg-stone-600/50'
					}
				`}
			>
				{category.label}
			</button>
		{/each}
	</div>
</div>

<style>
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}

	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
