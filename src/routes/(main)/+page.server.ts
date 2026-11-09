import type { PageServerLoad } from './$types';

const LISTING_QUERY = `
  id, slug, title, condition, starting_price, current_price, buy_it_now_price, end_date, created_at, seller_id,
  listing_images(image_url, is_primary, display_order),
  profiles:profiles!listings_seller_id_fkey(username, rating)
`;

export const load: PageServerLoad = async ({ locals }) => {
	// Query active listings from Supabase
	const base = () =>
		locals.supabase
			.from('listings')
			.select(LISTING_QUERY)
			.eq('status', 'active');

	const [featuredRes, recentRes] = await Promise.all([
		base().order('current_price', { ascending: false }).limit(8),
		base().order('created_at', { ascending: false }).limit(8)
	]);

	if (featuredRes.error) console.error('Featured listings error:', featuredRes.error.message);
	if (recentRes.error) console.error('Recent listings error:', recentRes.error.message);

	return {
		featured: featuredRes.data ?? [],
		recent: recentRes.data ?? []
	};
};
