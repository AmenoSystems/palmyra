import type { PageServerLoad } from './$types';

const LISTING_QUERY = `
  id, slug, title, condition, starting_price, current_price, buy_it_now_price, end_date, created_at, seller_id, status,
  listing_images(image_url, is_primary, display_order),
  profiles:profiles!listings_seller_id_fkey(username, rating),
  subcategories(id, name, slug, category_id, categories(id, name, slug))
`.trim();

export const load: PageServerLoad = async ({ locals, url }) => {
	const search = url.searchParams.get('q')?.trim() ?? '';
	const category = url.searchParams.get('category')?.trim() ?? '';
	const sort = url.searchParams.get('sort') ?? 'recent';
	const minStr = url.searchParams.get('min');
	const maxStr = url.searchParams.get('max');
	const min = minStr ? parseFloat(minStr) : null;
	const max = maxStr ? parseFloat(maxStr) : null;
	const listingType = url.searchParams.get('type') ?? 'all';
	const conditions = url.searchParams.getAll('condition').filter(Boolean);

	const page = parseInt(url.searchParams.get('page') ?? '1') || 1;
	const pageSize = 20;
	const offset = (page - 1) * pageSize;

	// Load categories for filter sidebar
	const { data: categories } = await locals.supabase
		.from('categories')
		.select('id, name, slug')
		.order('name');

	let query = locals.supabase
		.from('listings')
		.select(LISTING_QUERY, { count: 'exact' })
		.eq('status', 'active');

	if (search) {
		query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
	}

	if (min != null && !isNaN(min)) {
		query = query.gte('current_price', min);
	}

	if (max != null && !isNaN(max)) {
		query = query.lte('current_price', max);
	}

	if (conditions.length > 0) {
		query = query.in('condition', conditions);
	}

	if (listingType === 'buy_now') {
		query = query.not('buy_it_now_price', 'is', null);
	} else if (listingType === 'auction') {
		query = query.is('buy_it_now_price', null);
	}

	// Sorting
	switch (sort) {
		case 'price_asc':
			query = query.order('current_price', { ascending: true });
			break;
		case 'price_desc':
			query = query.order('current_price', { ascending: false });
			break;
		case 'ending_soon':
			query = query.order('end_date', { ascending: true });
			break;
		default:
			query = query.order('created_at', { ascending: false });
	}

	query = query.range(offset, offset + pageSize - 1);

	const { data: rawListings, count, error } = await query;
	if (error) console.error('Browse listings error:', error.message);

	// Client-side category filtering if joined
	let filteredListings = rawListings ?? [];
	if (category) {
		filteredListings = filteredListings.filter((l: any) => {
			const sub = l.subcategories;
			if (!sub) return true;
			const cat = sub.categories;
			return cat?.slug === category || sub.slug === category;
		});
	}

	return {
		listings: filteredListings,
		count: count ?? filteredListings.length,
		page,
		pageSize,
		search,
		sort,
		category,
		min,
		max,
		listingType,
		conditions,
		categories: categories ?? []
	};
};
