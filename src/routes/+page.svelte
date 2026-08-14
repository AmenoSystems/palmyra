<script>
    import ProductCard from '$lib/components/ProductCard.svelte';
    import { Maximize2 } from 'lucide-svelte';

    const dummyProducts = [
        {
        id: 1,
        name: 'Classic White Sneakers',
        desc: 'Comfortable and versatile for everyday wear.',
        image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop',
        price: 79.99,
        reviewScore: 4.8,
        reviewCount: 234,
        itemsSold: 520,
        condition: 'BRAND NEW',
        sellerName: 'Urban Kicks',
        bids: 24,
        time_left_days: 3,
        time_left_hours: 72,
        bid_deadline: '17th Aug, 03:36 PM'

        },
        {
        id: 2,
        name: 'Wireless Noise‑Cancelling Headphones',
        desc: 'Immerse yourself in pure sound with active noise cancellation.',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
        price: 199.00,
        reviewScore: 4.6,
        reviewCount: 189,
        itemsSold: 310,
        condition: 'USED',
        sellerName: 'AudioTech',
        bids: 12,
        time_left_days: 0,
        time_left_hours: 14,
        bid_deadline: '12th Aug, 04:20 AM'
        },
        {
        id: 3,
        name: 'Stainless Steel Water Bottle',
        desc: 'Keeps drinks cold for 24h and hot for 12h. Eco‑friendly.',
        image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop',
        price: 34.50,
        reviewScore: 4.9,
        reviewCount: 412,
        itemsSold: 980,
        condition: 'NEW - OPEN BOX',
        sellerName: 'EcoLife',
        bids: 40,
        time_left_days: 2,
        time_left_hours: 48,
        bid_deadline: '18th Aug, 12:20 PM'
        },
        {
        id: 4,
        name: 'Ergonomic Office Chair',
        desc: 'Designed for comfort and support during long work hours.',
        image: 'https://images.unsplash.com/photo-1612372606404-0ab33e7187ee?w=400&h=400&fit=crop',
        price: 149.99,
        reviewScore: 4.5,
        reviewCount: 76,
        itemsSold: 210,
        sellerName: 'Comfort Seating',
        bids: 14
        },
    ];

	// const { data } = $props();
    const data = { products: dummyProducts };
</script>

<div class="text-stone-800 dark:text-gray-300">
    <div class="mb-4 flex items-center justify-between">
        <a href="/listings" class="text-2xl font-bold hover:underline">Recent Listings</a>
        <button class=" rounded-full bg-gray-100/40 hover:bg-gray-100/50 p-2 text-stone-800 hover:text-stone-900">
            <Maximize2 class="w-4 h-4" />
        </button>
    </div>
	{#if data.products.length === 0}
		<p class="text-center">No products found.</p>
	{:else}
        <div
        class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
        {#each data.products as product (product.id)}
            <ProductCard {product} />
        {/each}
        </div>
	{/if}
</div>
