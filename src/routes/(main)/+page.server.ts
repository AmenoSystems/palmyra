import type { PageServerLoad } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import { applyListingOverridesToList } from '$lib/server/serverStore';

const LISTING_QUERY = `
  id, slug, title, condition, starting_price, current_price, buy_it_now_price, end_date, created_at, seller_id, status,
  listing_images(image_url, is_primary, display_order),
  profiles:profiles!listings_seller_id_fkey(username, rating)
`;

export const load: PageServerLoad = async ({ locals }) => {
	const db = supabaseAdmin || locals.supabase;

	const base = () =>
		db
			.from('listings')
			.select(LISTING_QUERY)
			.eq('status', 'active');

	const [featuredRes, recentRes] = await Promise.all([
		base().order('current_price', { ascending: false }).limit(16),
		base().order('created_at', { ascending: false }).limit(16)
	]);

	if (featuredRes.error) console.error('Featured listings error:', featuredRes.error.message);
	if (recentRes.error) console.error('Recent listings error:', recentRes.error.message);

	const featured = applyListingOverridesToList(featuredRes.data ?? [])
		.filter((l) => l.status === 'active')
		.slice(0, 8);

	const recent = applyListingOverridesToList(recentRes.data ?? [])
		.filter((l) => l.status === 'active')
		.slice(0, 8);

	return {
		featured,
		recent
	};
};
