import type { PageServerLoad } from './$types';

const LISTING_QUERY = `
  id, slug, title, condition, starting_price, current_price, buy_it_now_price, end_date, created_at,
  listing_images(image_url, is_primary, display_order),
  profiles:profiles!listings_seller_id_fkey(username, rating),
  subcategories(name, slug, category_id)
`.trim();

export const load: PageServerLoad = async ({ locals, url }) => {
  const now = new Date().toISOString();
  const search = url.searchParams.get('q')?.trim() ?? '';
  const categorySlug = url.searchParams.get('category') ?? '';
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

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  switch (sort) {
    case 'price_asc':
      query = query.order('current_price', { ascending: true }); break;
    case 'price_desc':
      query = query.order('current_price', { ascending: false }); break;
    case 'ending_soon':
      query = query.order('end_date', { ascending: true }); break;
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
    sort
  };
};
