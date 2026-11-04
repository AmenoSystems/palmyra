import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const slug = params.slug;

	const { data: listing, error: dbError } = await locals.supabase
		.from('listings')
		.select(
			`
      id, slug, title, description, condition, starting_price, current_price,
      buy_it_now_price, reserve_price, quantity, status, start_date, end_date,
      views, created_at, seller_id,
      listing_images(id, image_url, is_primary, display_order),
      listing_tags(tag),
      profiles(id, username, full_name, avatar_id, rating, total_reviews)
    `
		)
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

	const user = await locals.getUser();

	return {
		listing,
		sellerAvatarUrl,
		currentUser: user ? { id: user.id, email: user.email } : null
	};
};

export const actions: Actions = {
	placeBid: async ({ request, locals, params }) => {
		const user = await locals.getUser();
		if (!user) {
			return fail(401, { message: 'You must be signed in to place a bid.' });
		}

		const formData = await request.formData();
		const bidAmount = parseFloat(formData.get('bid_amount') as string);

		if (isNaN(bidAmount) || bidAmount <= 0) {
			return fail(400, { message: 'Please enter a valid bid amount.' });
		}

		// Fetch current listing
		const { data: listing, error: lErr } = await locals.supabase
			.from('listings')
			.select('id, seller_id, current_price, status, end_date')
			.eq('slug', params.slug)
			.single();

		if (lErr || !listing) return fail(404, { message: 'Listing not found.' });

		if (listing.seller_id === user.id) {
			return fail(400, { message: 'You cannot bid on your own listing.' });
		}

		const now = new Date();
		if (listing.status !== 'active' || now > new Date(listing.end_date)) {
			return fail(400, { message: 'This auction has ended.' });
		}

		if (bidAmount <= Number(listing.current_price)) {
			return fail(400, {
				message: `Bid must be higher than current price of ₹${Number(listing.current_price).toLocaleString('en-IN')}`
			});
		}

		// Insert into bids table
		const { data: bid, error: bErr } = await locals.supabase
			.from('bids')
			.insert({
				listing_id: listing.id,
				bidder_id: user.id,
				amount: bidAmount,
				status: 'active'
			})
			.select('id')
			.single();

		if (bErr) {
			console.error('Bid insert error:', bErr.message);
			return fail(500, { message: 'Failed to record bid. Please try again.' });
		}

		// Update listing current_price
		await locals.supabase
			.from('listings')
			.update({ current_price: bidAmount })
			.eq('id', listing.id);

		// Record in bid_history
		if (bid) {
			await locals.supabase.from('bid_history').insert({
				listing_id: listing.id,
				bid_id: bid.id,
				previous_price: listing.current_price,
				new_price: bidAmount,
				change_type: 'bid'
			});
		}

		return {
			success: true,
			message: `Bid of ₹${bidAmount.toLocaleString('en-IN')} placed successfully!`
		};
	},

	buyNow: async ({ locals, params }) => {
		const user = await locals.getUser();
		if (!user) {
			return fail(401, { message: 'You must be signed in to buy this item.' });
		}

		const { data: listing, error: lErr } = await locals.supabase
			.from('listings')
			.select('id, seller_id, buy_it_now_price, current_price, status, end_date')
			.eq('slug', params.slug)
			.single();

		if (lErr || !listing || !listing.buy_it_now_price) {
			return fail(400, { message: 'Buy It Now is not available for this listing.' });
		}

		if (listing.seller_id === user.id) {
			return fail(400, { message: 'You cannot purchase your own listing.' });
		}

		const now = new Date();
		if (listing.status !== 'active' || now > new Date(listing.end_date)) {
			return fail(400, { message: 'This auction has ended.' });
		}

		// Record winning bid
		const { data: bid } = await locals.supabase
			.from('bids')
			.insert({
				listing_id: listing.id,
				bidder_id: user.id,
				amount: listing.buy_it_now_price,
				status: 'won'
			})
			.select('id')
			.single();

		// Mark listing as sold
		await locals.supabase
			.from('listings')
			.update({
				current_price: listing.buy_it_now_price,
				status: 'sold'
			})
			.eq('id', listing.id);

		if (bid) {
			await locals.supabase.from('bid_history').insert({
				listing_id: listing.id,
				bid_id: bid.id,
				previous_price: listing.current_price,
				new_price: listing.buy_it_now_price,
				change_type: 'buy_it_now'
			});
		}

		return {
			success: true,
			message: `Congratulations! You purchased this item for ₹${Number(listing.buy_it_now_price).toLocaleString('en-IN')}`
		};
	}
};
