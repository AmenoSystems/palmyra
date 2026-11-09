import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const slug = params.slug;

  const { data: listing, error: dbError } = await locals.supabase
    .from('listings')
    .select(`
      id, slug, title, description, condition, starting_price, current_price,
      buy_it_now_price, reserve_price, quantity, status, start_date, end_date,
      views, created_at, seller_id,
      listing_images(id, image_url, is_primary, display_order),
      listing_tags(tag),
      profiles(id, username, full_name, avatar_id, rating, total_reviews)
    `)
    .eq('slug', slug)
    .maybeSingle();

  if (dbError) {
    console.error('Listing detail error:', dbError.message);
    error(500, 'Failed to load listing');
  }

  if (!listing) error(404, 'Listing not found');

  // Sort images by display_order
  if (listing.listing_images) {
    listing.listing_images.sort((a: any, b: any) => a.display_order - b.display_order);
  }

  // Increment view count (fire-and-forget — don't block render)
  locals.supabase
    .from('listings')
    .update({ views: (listing.views ?? 0) + 1 })
    .eq('id', listing.id)
    .then(() => {});

  // Get seller profile picture URL
  let sellerAvatarUrl: string | null = null;
  const profile = listing.profiles as any;
  if (profile?.avatar_id) {
    const { data: urlData } = locals.supabase.storage
      .from('profile_pictures')
      .getPublicUrl(profile.avatar_id);
    sellerAvatarUrl = urlData?.publicUrl ?? null;
  }

  return { listing, sellerAvatarUrl };
};
