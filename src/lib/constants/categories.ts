export interface Category {
	id: string;
	name: string;
	slug: string;
}

export interface Subcategory {
	id: string;
	category_id: string;
	name: string;
	slug: string;
}

export const CANONICAL_CATEGORIES: Category[] = [
	{ id: 'c0000001-0000-0000-0000-000000000001', name: 'Electronics', slug: 'electronics' },
	{ id: 'c0000002-0000-0000-0000-000000000002', name: 'Fashion', slug: 'fashion' },
	{ id: 'c0000003-0000-0000-0000-000000000003', name: 'Home & Living', slug: 'home-living' },
	{ id: 'c0000004-0000-0000-0000-000000000004', name: 'Sports', slug: 'sports' },
	{ id: 'c0000005-0000-0000-0000-000000000005', name: 'Books', slug: 'books' },
	{ id: 'c0000006-0000-0000-0000-000000000006', name: 'Collectibles', slug: 'collectibles' },
	{ id: 'c0000007-0000-0000-0000-000000000007', name: 'Automotive', slug: 'automotive' },
	{ id: 'c0000008-0000-0000-0000-000000000008', name: 'Art & Crafts', slug: 'art-crafts' }
];

export const CANONICAL_SUBCATEGORIES: Subcategory[] = [
	// Electronics
	{ id: 's0000001-0000-0000-0000-000000000001', category_id: 'c0000001-0000-0000-0000-000000000001', name: 'Phones & Tablets', slug: 'phones-tablets' },
	{ id: 's0000002-0000-0000-0000-000000000002', category_id: 'c0000001-0000-0000-0000-000000000001', name: 'Laptops & Computers', slug: 'laptops-computers' },
	{ id: 's0000003-0000-0000-0000-000000000003', category_id: 'c0000001-0000-0000-0000-000000000001', name: 'Audio & Headphones', slug: 'audio-headphones' },
	{ id: 's0000004-0000-0000-0000-000000000004', category_id: 'c0000001-0000-0000-0000-000000000001', name: 'Cameras', slug: 'cameras' },
	{ id: 's0000005-0000-0000-0000-000000000005', category_id: 'c0000001-0000-0000-0000-000000000001', name: 'Gaming', slug: 'gaming' },

	// Fashion
	{ id: 's0000006-0000-0000-0000-000000000006', category_id: 'c0000002-0000-0000-0000-000000000002', name: "Men's Clothing", slug: 'mens-clothing' },
	{ id: 's0000007-0000-0000-0000-000000000007', category_id: 'c0000002-0000-0000-0000-000000000002', name: "Women's Clothing", slug: 'womens-clothing' },
	{ id: 's0000008-0000-0000-0000-000000000008', category_id: 'c0000002-0000-0000-0000-000000000002', name: 'Shoes', slug: 'shoes' },
	{ id: 's0000009-0000-0000-0000-000000000009', category_id: 'c0000002-0000-0000-0000-000000000002', name: 'Watches & Accessories', slug: 'watches-accessories' },

	// Home & Living
	{ id: 's0000010-0000-0000-0000-000000000010', category_id: 'c0000003-0000-0000-0000-000000000003', name: 'Furniture', slug: 'furniture' },
	{ id: 's0000011-0000-0000-0000-000000000011', category_id: 'c0000003-0000-0000-0000-000000000003', name: 'Kitchen & Dining', slug: 'kitchen-dining' },
	{ id: 's0000012-0000-0000-0000-000000000012', category_id: 'c0000003-0000-0000-0000-000000000003', name: 'Decor', slug: 'decor' },

	// Sports
	{ id: 's0000013-0000-0000-0000-000000000013', category_id: 'c0000004-0000-0000-0000-000000000004', name: 'Outdoor & Camping', slug: 'outdoor-camping' },
	{ id: 's0000014-0000-0000-0000-000000000014', category_id: 'c0000004-0000-0000-0000-000000000004', name: 'Exercise & Fitness', slug: 'exercise-fitness' },
	{ id: 's0000015-0000-0000-0000-000000000015', category_id: 'c0000004-0000-0000-0000-000000000004', name: 'Team Sports', slug: 'team-sports' },

	// Books
	{ id: 's0000016-0000-0000-0000-000000000016', category_id: 'c0000005-0000-0000-0000-000000000005', name: 'Fiction', slug: 'fiction' },
	{ id: 's0000017-0000-0000-0000-000000000017', category_id: 'c0000005-0000-0000-0000-000000000005', name: 'Non-Fiction', slug: 'non-fiction' },
	{ id: 's0000018-0000-0000-0000-000000000018', category_id: 'c0000005-0000-0000-0000-000000000005', name: 'Textbooks', slug: 'textbooks' },

	// Collectibles
	{ id: 's0000019-0000-0000-0000-000000000019', category_id: 'c0000006-0000-0000-0000-000000000006', name: 'Coins & Stamps', slug: 'coins-stamps' },
	{ id: 's0000020-0000-0000-0000-000000000020', category_id: 'c0000006-0000-0000-0000-000000000006', name: 'Trading Cards', slug: 'trading-cards' },
	{ id: 's0000021-0000-0000-0000-000000000021', category_id: 'c0000006-0000-0000-0000-000000000006', name: 'Vintage & Antiques', slug: 'vintage-antiques' },

	// Automotive
	{ id: 's0000022-0000-0000-0000-000000000022', category_id: 'c0000007-0000-0000-0000-000000000007', name: 'Car Parts', slug: 'car-parts' },
	{ id: 's0000023-0000-0000-0000-000000000023', category_id: 'c0000007-0000-0000-0000-000000000007', name: 'Motorcycles', slug: 'motorcycles' },

	// Art & Crafts
	{ id: 's0000024-0000-0000-0000-000000000024', category_id: 'c0000008-0000-0000-0000-000000000008', name: 'Paintings', slug: 'paintings' },
	{ id: 's0000025-0000-0000-0000-000000000025', category_id: 'c0000008-0000-0000-0000-000000000008', name: 'Handmade Crafts', slug: 'handmade-crafts' }
];

export function getCategoryBySlug(slug: string): Category | undefined {
	return CANONICAL_CATEGORIES.find(
		(c) => c.slug.toLowerCase() === slug.toLowerCase() || c.id === slug
	);
}

export function getSubcategoryBySlug(slug: string): Subcategory | undefined {
	return CANONICAL_SUBCATEGORIES.find(
		(s) => s.slug.toLowerCase() === slug.toLowerCase() || s.id === slug
	);
}
