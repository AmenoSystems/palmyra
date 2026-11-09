import type { PageServerLoad } from './$types';

const LISTING_QUERY = `
  id, slug, title, condition, starting_price, current_price, buy_it_now_price, end_date, created_at,
  listing_images(image_url, is_primary, display_order),
  profiles:profiles!listings_seller_id_fkey(username, rating)
`;

export const load: PageServerLoad = async ({ locals }) => {
  const now = new Date().toISOString();

  const base = () =>
    locals.supabase
      .from('listings')
      .select(LISTING_QUERY)
      .eq('status', 'active')
      .lte('start_date', now)
      .gt('end_date', now);

  const [featuredRes, recentRes] = await Promise.all([
    base().order('current_price', { ascending: false, nullsFirst: false }).limit(8),
    base().order('created_at', { ascending: false }).limit(8)
  ]);

  if (featuredRes.error) console.error('featured:', featuredRes.error);
  if (recentRes.error) console.error('recent:', recentRes.error);

  return {
    featured: featuredRes.data ?? [],
    recent: recentRes.data ?? []
  };
};