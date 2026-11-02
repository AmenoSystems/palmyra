import type { PageServerLoad } from './$types';

const LISTING_QUERY = `
  id, slug, title, condition, starting_price, current_price, buy_it_now_price, end_date, created_at,
  listing_images(image_url, is_primary, display_order),
  profiles(username, rating)
`.trim();

function activeFilter(supabase: any) {
  const now = new Date().toISOString();
  return supabase
    .from('listings')
    .select(LISTING_QUERY)
    .eq('status', 'active')
    .lte('start_date', now)
    .gte('end_date', now);
}

export const load: PageServerLoad = async ({ locals }) => {
  // Featured: highest current_price
  const { data: featured } = await activeFilter(locals.supabase)
    .order('current_price', { ascending: false })
    .limit(8);

  // Recent: newest first
  const { data: recent } = await activeFilter(locals.supabase)
    .order('created_at', { ascending: false })
    .limit(8);

  return {
    featured: featured ?? [],
    recent: recent ?? []
  };
};
