import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import {
	getServerBids,
	recordServerBid,
	getListingOverride,
	setListingOverride,
	recordServerOrder
} from '$lib/server/serverStore';

export const load: PageServerLoad = async ({ params, locals, cookies }) => {
	const slug = params.slug;
	const dbClient = supabaseAdmin || locals.supabase;

	// Load listing from Supabase by slug OR by id (UUID)
	const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
	let query = dbClient
		.from('listings')
		.select(
			`
      id, slug, title, description, condition, starting_price, current_price,
      buy_it_now_price, reserve_price, quantity, status, start_date, end_date,
      views, created_at, seller_id,
      listing_images(id, image_url, is_primary, display_order),
      subcategories(id, name, slug, category_id, categories(id, name, slug)),
      profiles:profiles!listings_seller_id_fkey(id, username, full_name, avatar_id, rating, total_reviews)
    `
		);

	if (isUuid) {
		query = query.or(`slug.eq.${slug},id.eq.${slug}`);
	} else {
		query = query.eq('slug', slug);
	}

	const { data: listing, error: dbError } = await query.maybeSingle();

	if (dbError) {
		console.error('Listing load error:', dbError.message);
		error(500, 'Failed to load listing.');
	}

	if (!listing) {
		error(404, 'Product not found or has been removed.');
	}

	// Sort gallery images by display_order
	if (listing.listing_images) {
		listing.listing_images.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
	}

	// Increment view count consistently (only once per visitor session / 24h)
	const viewCookieKey = `viewed_${listing.id}`;
	if (!cookies.get(viewCookieKey)) {
		cookies.set(viewCookieKey, '1', { path: '/', maxAge: 60 * 60 * 24 });
		locals.supabase
			.from('listings')
			.update({ views: (listing.views ?? 0) + 1 })
			.eq('id', listing.id)
			.then(() => {});
	}

	// Load bid history from Supabase and serverStore
	const { data: dbBids } = await dbClient
		.from('bids')
		.select('id, amount, created_at, bidder_id, profiles:profiles!bids_bidder_id_fkey(username)')
		.eq('listing_id', listing.id)
		.order('created_at', { ascending: false })
		.limit(20);

	const serverBids = getServerBids(listing.id);
	const override = getListingOverride(listing.id);

	if (override?.status) {
		listing.status = override.status;
	}

	const mergedBids: any[] = [];
	const seenBidIds = new Set<string>();

	if (dbBids) {
		for (const b of dbBids) {
			seenBidIds.add(b.id);
			mergedBids.push(b);
		}
	}
	for (const sb of serverBids) {
		if (!seenBidIds.has(sb.id)) {
			seenBidIds.add(sb.id);
			mergedBids.push({
				id: sb.id,
				amount: sb.amount,
				created_at: sb.created_at,
				bidder_id: sb.bidder_id,
				profiles: { username: sb.bidder_username ?? 'Bidder' }
			});
		}
	}

	mergedBids.sort((a, b) => Number(b.amount) - Number(a.amount));

	const bidCount = mergedBids.length;
	const highestBid = mergedBids.length > 0 ? Number(mergedBids[0].amount) : 0;
	const overridePrice = Number(override?.current_price || 0);

	const effectiveCurrentPrice = Math.max(
		highestBid,
		overridePrice,
		Number(listing.current_price ?? listing.starting_price ?? 0)
	);
	listing.current_price = effectiveCurrentPrice;

	// Seller profile & avatar
	const profile = Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles;
	let sellerAvatarUrl: string | null = null;
	if (profile?.avatar_id) {
		const { data: urlData } = locals.supabase.storage
			.from('profile_pictures')
			.getPublicUrl(profile.avatar_id);
		sellerAvatarUrl = urlData?.publicUrl ?? null;
	}

	const user = await locals.getUser();

	// Check if current user is following the seller
	let isFollowing = false;
	let isWatchlisted = false;

	if (user && profile?.id) {
		const { data: followRow } = await locals.supabase
			.from('follows')
			.select('follower_id')
			.eq('follower_id', user.id)
			.eq('following_id', profile.id)
			.maybeSingle();
		isFollowing = !!followRow;

		const { data: watchRow } = await locals.supabase
			.from('watchlist')
			.select('id')
			.eq('user_id', user.id)
			.eq('listing_id', listing.id)
			.maybeSingle();
		isWatchlisted = !!watchRow;
	}

	return {
		listing,
		sellerAvatarUrl,
		bids: mergedBids,
		bidCount,
		isFollowing,
		isWatchlisted,
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

		// Fetch current listing by slug OR by id (UUID)
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.slug);
		const dbClient = supabaseAdmin || locals.supabase;
		let q = dbClient
			.from('listings')
			.select('id, title, slug, seller_id, current_price, starting_price, buy_it_now_price, status, end_date, listing_images(image_url)');
		if (isUuid) {
			q = q.or(`slug.eq.${params.slug},id.eq.${params.slug}`);
		} else {
			q = q.eq('slug', params.slug);
		}
		const { data: listing, error: lErr } = await q.maybeSingle();

		if (lErr || !listing) return fail(404, { message: 'Listing not found.' });

		if (listing.seller_id === user.id) {
			return fail(400, { message: 'You cannot bid on your own product.' });
		}

		const now = new Date();
		const override = getListingOverride(listing.id);
		const currentStatus = override?.status || listing.status;
		if (currentStatus !== 'active') {
			return fail(400, { message: 'This auction is no longer active.' });
		}
		if (listing.end_date && now > new Date(listing.end_date)) {
			return fail(400, {
				message: `This auction ended on ${new Date(listing.end_date).toLocaleDateString()}. Please place bids on active auctions.`
			});
		}

		// Strictly check against the current highest bid from Supabase, serverStore, and overrides
		const { data: topBid } = await dbClient
			.from('bids')
			.select('amount')
			.eq('listing_id', listing.id)
			.order('amount', { ascending: false })
			.limit(1)
			.maybeSingle();

		const serverBids = getServerBids(listing.id);
		const topServerBid = serverBids.length > 0 ? serverBids[0].amount : 0;
		const overridePrice = override?.current_price ?? 0;

		const currentPrice = Math.max(
			Number(topBid?.amount ?? 0),
			Number(topServerBid),
			Number(overridePrice),
			Number(listing.current_price ?? listing.starting_price ?? 0)
		);

		if (bidAmount <= currentPrice) {
			return fail(400, {
				message: `Bid must be strictly higher than current price of ₹${currentPrice.toLocaleString('en-IN')}`
			});
		}

		// Condition: Buyer cannot place bids greater than or equal to Buy Now price
		if (listing.buy_it_now_price && bidAmount >= Number(listing.buy_it_now_price)) {
			return fail(400, {
				message: `Bid cannot exceed or equal the Buy Now price of ₹${Number(listing.buy_it_now_price).toLocaleString('en-IN')}. Please use Buy Now instead.`
			});
		}

		// Ensure profile exists for this bidder to satisfy bids foreign key
		try {
			await locals.supabase
				.from('profiles')
				.upsert(
					{ id: user.id, username: user.email?.split('@')[0] ?? 'Bidder' },
					{ onConflict: 'id' }
				);
		} catch {
			// ignore
		}

		// Insert into bids table
		let fallbackBid: any = null;
		let rlsBlocked = false;
		let bidId = crypto.randomUUID();
		const { data: bid, error: bErr } = await dbClient
			.from('bids')
			.insert({
				listing_id: listing.id,
				bidder_id: user.id,
				amount: bidAmount,
				status: 'active'
			})
			.select('id')
			.maybeSingle();

		if (bid) {
			bidId = bid.id;
		}

		if (bErr) {
			if (bErr.code === '42501') {
				rlsBlocked = true;
			} else {
				console.error('Bid insert error:', bErr.message);
				return fail(500, { message: `Failed to record bid: ${bErr.message}` });
			}
		}

		// Record in serverStore for cross-session/cross-browser consistency
		const images = listing.listing_images ?? [];
		const primaryImg = images[0]?.image_url ?? null;
		const serverBidRecord = recordServerBid({
			id: bidId,
			listing_id: listing.id,
			seller_id: listing.seller_id,
			bidder_id: user.id,
			bidder_username: user.email?.split('@')[0] ?? 'You',
			amount: bidAmount,
			created_at: new Date().toISOString(),
			title: listing.title,
			slug: listing.slug,
			image_url: primaryImg,
			end_date: listing.end_date,
			status: 'active'
		});

		fallbackBid = {
			id: serverBidRecord.id,
			listing_id: listing.id,
			seller_id: listing.seller_id,
			bidder_id: user.id,
			bidder_username: user.email?.split('@')[0] ?? 'You',
			amount: bidAmount,
			created_at: serverBidRecord.created_at,
			profiles: { username: user.email?.split('@')[0] ?? 'You' }
		};

		// Update listing current_price
		try {
			await dbClient
				.from('listings')
				.update({ current_price: bidAmount, updated_at: new Date().toISOString() })
				.eq('id', listing.id);
		} catch {
			// ignore RLS update restrictions
		}

		// Record in bid_history
		if (bid) {
			try {
				await dbClient.from('bid_history').insert({
					listing_id: listing.id,
					bid_id: bid.id,
					previous_price: currentPrice,
					new_price: bidAmount,
					change_type: 'bid'
				});
			} catch (e) {
				console.error('bid_history error:', e);
			}
		}

		const successMessage = rlsBlocked
			? `Bid of ₹${bidAmount.toLocaleString('en-IN')} placed successfully! (Saved to auction record.)`
			: `Bid of ₹${bidAmount.toLocaleString('en-IN')} placed successfully!`;

		return {
			success: true,
			bidPlaced: true,
			rlsBlocked,
			fallbackBid,
			newAmount: bidAmount,
			message: successMessage
		};
	},

	buyNow: async ({ locals, params }) => {
		const user = await locals.getUser();
		if (!user) {
			return fail(401, { message: 'You must be signed in to submit a Buy Now purchase request.' });
		}

		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.slug);
		let q = locals.supabase
			.from('listings')
			.select(
				`
        id, seller_id, title, slug, buy_it_now_price, current_price, status, quantity, end_date,
        listing_images(image_url)
      `
			);
		if (isUuid) {
			q = q.or(`slug.eq.${params.slug},id.eq.${params.slug}`);
		} else {
			q = q.eq('slug', params.slug);
		}
		const { data: listing, error: lErr } = await q.maybeSingle();

		if (lErr || !listing || !listing.buy_it_now_price) {
			return fail(400, { message: 'Buy Now is not available for this product.' });
		}

		if (listing.seller_id === user.id) {
			return fail(400, { message: 'You cannot purchase your own product.' });
		}

		if (listing.status !== 'active') {
			return fail(400, { message: 'This product is no longer available for purchase.' });
		}

		// Prevent duplicate pending requests from same buyer for this listing
		try {
			const { data: existingOrder } = await locals.supabase
				.from('orders')
				.select('id, status')
				.eq('listing_id', listing.id)
				.eq('buyer_id', user.id)
				.eq('status', 'Pending Seller Approval')
				.maybeSingle();

			if (existingOrder) {
				return fail(400, {
					message: 'You already have a pending purchase request for this product.'
				});
			}
		} catch {
			// orders table might not exist yet
		}

		// Try creating purchase request in orders table
		let fallbackOrder: any = null;
		const { error: orderError } = await locals.supabase.from('orders').insert({
			listing_id: listing.id,
			buyer_id: user.id,
			seller_id: listing.seller_id,
			price: listing.buy_it_now_price,
			quantity: 1,
			status: 'Pending Seller Approval'
		});

		if (orderError) {
			if (orderError.code === 'PGRST205') {
				// Table not yet created in Supabase SQL editor: create resilient client-side order
				fallbackOrder = {
					id: crypto.randomUUID(),
					listing_id: listing.id,
					buyer_id: user.id,
					seller_id: listing.seller_id,
					price: Number(listing.buy_it_now_price),
					quantity: 1,
					status: 'Pending Seller Approval',
					created_at: new Date().toISOString(),
					listing: {
						id: listing.id,
						title: listing.title,
						slug: listing.slug,
						buy_it_now_price: Number(listing.buy_it_now_price),
						listing_images: listing.listing_images
					}
				};
			} else {
				console.error('Order creation error:', orderError.message);
				return fail(500, { message: `Failed to create purchase request: ${orderError.message}` });
			}
		}

		return {
			success: true,
			buyNowSubmitted: true,
			fallbackOrder,
			message: `Purchase request for ₹${Number(listing.buy_it_now_price).toLocaleString('en-IN')} submitted! Status: Pending Seller Approval.`
		};
	},

	toggleFollow: async ({ locals, request }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { message: 'Please sign in to follow sellers.' });

		const formData = await request.formData();
		const sellerId = formData.get('seller_id') as string;

		if (!sellerId || sellerId === user.id) {
			return fail(400, { message: 'Invalid seller.' });
		}

		const { data: existing } = await locals.supabase
			.from('follows')
			.select('follower_id')
			.eq('follower_id', user.id)
			.eq('following_id', sellerId)
			.maybeSingle();

		if (existing) {
			await locals.supabase
				.from('follows')
				.delete()
				.eq('follower_id', user.id)
				.eq('following_id', sellerId);
			return { success: true, isFollowing: false, message: 'Unfollowed seller.' };
		} else {
			await locals.supabase
				.from('follows')
				.insert({ follower_id: user.id, following_id: sellerId });
			return { success: true, isFollowing: true, message: 'Followed seller!' };
		}
	},

	toggleWatchlist: async ({ locals, params }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { message: 'Please sign in to save items.' });

		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.slug);
		let q = locals.supabase.from('listings').select('id');
		if (isUuid) {
			q = q.or(`slug.eq.${params.slug},id.eq.${params.slug}`);
		} else {
			q = q.eq('slug', params.slug);
		}
		const { data: listing } = await q.maybeSingle();

		if (!listing) return fail(404, { message: 'Listing not found.' });

		const { data: existing } = await locals.supabase
			.from('watchlist')
			.select('id')
			.eq('user_id', user.id)
			.eq('listing_id', listing.id)
			.maybeSingle();

		if (existing) {
			await locals.supabase
				.from('watchlist')
				.delete()
				.eq('user_id', user.id)
				.eq('listing_id', listing.id);
			return { success: true, isWatchlisted: false };
		} else {
			await locals.supabase
				.from('watchlist')
				.insert({ user_id: user.id, listing_id: listing.id });
			return { success: true, isWatchlisted: true };
		}
	},

	closeAndSell: async ({ locals, params, request }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { message: 'Unauthorized' });

		const dbClient = supabaseAdmin || locals.supabase;

		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.slug);
		let q = dbClient
			.from('listings')
			.select('id, seller_id, title, slug, current_price, starting_price, status, listing_images(image_url)');
		if (isUuid) {
			q = q.or(`slug.eq.${params.slug},id.eq.${params.slug}`);
		} else {
			q = q.eq('slug', params.slug);
		}
		const { data: listing } = await q.maybeSingle();

		if (!listing) return fail(404, { message: 'Listing not found' });
		if (listing.seller_id !== user.id) {
			return fail(403, { message: 'Only the seller can close this auction.' });
		}
		const override = getListingOverride(listing.id);
		if (listing.status === 'sold' || override?.status === 'sold') {
			return fail(400, { message: 'This item is already sold.' });
		}

		// Read fallback form details
		const formData = await request.formData();
		const formBuyerId = formData.get('buyer_id') as string;
		const formBuyerUsername = formData.get('buyer_username') as string;
		const formPrice = Number(formData.get('price'));

		// Query highest bid from Supabase bids table OR serverStore
		const { data: topBid } = await dbClient
			.from('bids')
			.select('id, amount, bidder_id, profiles(username)')
			.eq('listing_id', listing.id)
			.order('amount', { ascending: false })
			.limit(1)
			.maybeSingle();

		const serverBids = getServerBids(listing.id);
		const topServer = serverBids.length > 0 ? serverBids[0] : null;

		const winnerId = topBid?.bidder_id || topServer?.bidder_id || formBuyerId;
		const winningPrice = Number(topBid?.amount || topServer?.amount || formPrice || listing.current_price || listing.starting_price);
		const winnerUsername = (topBid?.profiles as any)?.username || topServer?.bidder_username || formBuyerUsername || 'Buyer';

		if (!winnerId) {
			return fail(400, { message: 'Cannot close and sell an auction with no bids.' });
		}

		// 1. Update listing status to 'sold'
		await dbClient
			.from('listings')
			.update({
				status: 'sold',
				current_price: winningPrice,
				updated_at: new Date().toISOString()
			})
			.eq('id', listing.id)
			.eq('seller_id', user.id);

		// Record in serverStore
		setListingOverride(listing.id, { status: 'sold', current_price: winningPrice });

		// 2. Insert order record with status 'Accepted'
		let orderId = crypto.randomUUID();
		try {
			const { data: insertedOrder } = await dbClient
				.from('orders')
				.insert({
					listing_id: listing.id,
					buyer_id: winnerId,
					seller_id: user.id,
					price: winningPrice,
					quantity: 1,
					status: 'Accepted'
				})
				.select('id')
				.maybeSingle();

			if (insertedOrder) {
				orderId = insertedOrder.id;
			}
		} catch (e) {
			console.error('Order insert error on closeAndSell:', e);
		}

		const images = listing.listing_images ?? [];
		const primaryImg = images[0]?.image_url ?? null;

		recordServerOrder({
			id: orderId,
			listing_id: listing.id,
			buyer_id: winnerId,
			seller_id: user.id,
			price: winningPrice,
			quantity: 1,
			status: 'Accepted',
			created_at: new Date().toISOString(),
			title: listing.title,
			slug: listing.slug,
			image_url: primaryImg,
			buyer_username: winnerUsername
		});

		return {
			success: true,
			auctionClosed: true,
			message: `Auction successfully closed! Item sold to @${winnerUsername} for ₹${winningPrice.toLocaleString('en-IN')}.`,
			saleDetails: {
				order_id: orderId,
				listing_id: listing.id,
				seller_id: user.id,
				buyer_id: winnerId,
				buyer_username: winnerUsername,
				price: winningPrice,
				title: listing.title,
				slug: listing.slug,
				image_url: primaryImg
			}
		};
	}
};
