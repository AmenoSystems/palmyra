import type { PageServerLoad } from './$types';
import {
	CANONICAL_CATEGORIES,
	CANONICAL_SUBCATEGORIES
} from '$lib/constants/categories';

const LISTING_QUERY = `
  id, slug, title, description, condition, starting_price, current_price, buy_it_now_price, end_date, created_at,
  listing_images(image_url, is_primary, display_order),
  profiles:profiles!listings_seller_id_fkey(username, rating),
  subcategories(name, slug, category_id)
`.trim();

export const load: PageServerLoad = async ({ locals, url }) => {
	const now = new Date().toISOString();
	const search = url.searchParams.get('q')?.trim() ?? '';
	const categorySlug = url.searchParams.get('category')?.trim().toLowerCase() ?? '';
	const sort = url.searchParams.get('sort') ?? 'recent';
	const page = parseInt(url.searchParams.get('page') ?? '1');
	const pageSize = 20;
	const offset = (page - 1) * pageSize;

	let query = locals.supabase
		.from('listings')
		.select(LISTING_QUERY, { count: 'exact' })
		.eq('status', 'active')
		.lte('start_date', now)
		.gte('end_date', now);

	// Keyword search
	if (search) {
		query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
	}

	// Category filter
	if (categorySlug) {
		const matchedCat = CANONICAL_CATEGORIES.find(
			(c) => c.slug === categorySlug || c.id === categorySlug
		);
		const relatedSlugs = [categorySlug];
		if (matchedCat) {
			const subSlugs = CANONICAL_SUBCATEGORIES
				.filter((s) => s.category_id === matchedCat.id)
				.map((s) => s.slug);
			relatedSlugs.push(...subSlugs);
		}

		// Search across title, description or tag references
		const terms = relatedSlugs.slice(0, 4).map((s) => `title.ilike.%${s}%,description.ilike.%${s}%`).join(',');
		query = query.or(terms);
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

	const { data: listings, count, error } = await query;
	if (error) console.error('Browse listings error:', error.message);

	return {
		listings: listings ?? [],
		count: count ?? 0,
		page,
		pageSize,
		search,
		categorySlug,
		sort
	};
};
