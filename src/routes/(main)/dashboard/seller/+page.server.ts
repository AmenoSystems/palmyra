import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import {
	getServerBidsForSeller,
	getServerBids,
	getServerOrdersForSeller,
	getListingOverride,
	setListingOverride,
	recordServerOrder,
	updateServerOrderStatus
} from '$lib/server/serverStore';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/auth/signin?next=/dashboard/seller');

	const db = supabaseAdmin || locals.supabase;

	let listings: any[] = [];
	let purchaseRequests: any[] = [];
	let incomingBids: any[] = [];

	// 1. Fetch seller listings
	try {
		const { data: listingsData, error: lErr } = await db
			.from('listings')
			.select(
				`
        id, title, slug, description, condition, starting_price, current_price,
        buy_it_now_price, quantity, status, start_date, end_date, views, created_at,
        listing_images(id, image_url, is_primary)
      `
			)
			.eq('seller_id', user.id)
			.order('created_at', { ascending: false });

		if (!lErr && listingsData) {
			listings = listingsData.map((l: any) => {
				const images = l.listing_images ?? [];
				const primary = images.find((i: any) => i.is_primary) ?? images[0];
				const override = getListingOverride(l.id);

				return {
					...l,
					status: override?.status ?? l.status,
					current_price: Math.max(
						Number(override?.current_price ?? 0),
						Number(l.current_price ?? l.starting_price ?? 0)
					),
					primary_image: primary?.image_url ?? null
				};
			});
		}
	} catch (e) {
		console.error('Error fetching seller listings:', e);
	}

	// 2. Fetch incoming purchase requests (orders where seller_id = user.id)
	try {
		const { data: ordersData, error: oErr } = await db
			.from('orders')
			.select(
				`
        id, price, quantity, status, created_at, listing_id, buyer_id,
        listings(id, title, slug, status, listing_images(image_url, is_primary)),
        profiles:profiles!orders_buyer_id_fkey(id, username, full_name, avatar_id)
      `
			)
			.eq('seller_id', user.id)
			.order('created_at', { ascending: false });

		if (!oErr && ordersData) {
			purchaseRequests = ordersData.map((o: any) => {
				const l = o.listings;
				const images = l?.listing_images ?? [];
				const primary = images.find((i: any) => i.is_primary) ?? images[0];
				const buyerProfile = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;

				return {
					id: o.id,
					listing_id: o.listing_id,
					title: l?.title ?? 'Product',
					slug: l?.slug ?? o.listing_id,
					image_url: primary?.image_url ?? null,
					price: Number(o.price),
					status: o.status,
					created_at: o.created_at,
					buyer_id: o.buyer_id,
					buyer_username: buyerProfile?.username ?? 'Buyer',
					buyer_name: buyerProfile?.full_name ?? buyerProfile?.username ?? 'Buyer'
				};
			});
		}
	} catch (e) {
		console.error('Error fetching purchase requests:', e);
	}

	// Merge serverStore orders for this seller
	const serverOrders = getServerOrdersForSeller(user.id);
	for (const so of serverOrders) {
		if (!purchaseRequests.some((pr) => pr.id === so.id)) {
			purchaseRequests.push({
				id: so.id,
				listing_id: so.listing_id,
				title: so.title ?? 'Product',
				slug: so.slug ?? so.listing_id,
				image_url: so.image_url ?? null,
				price: Number(so.price),
				status: so.status,
				created_at: so.created_at,
				buyer_id: so.buyer_id,
				buyer_username: so.buyer_username ?? 'Buyer',
				buyer_name: so.buyer_username ?? 'Buyer'
			});
		}
	}

	// 3. Fetch incoming bids on seller's listings
	try {
		const sellerListingIds = listings.map((l) => l.id);
		if (sellerListingIds.length > 0) {
			const { data: bidsData, error: bErr } = await db
				.from('bids')
				.select(
					`
          id, amount, created_at, bidder_id, listing_id,
          listings(id, title, slug, current_price, end_date),
          profiles(username)
        `
				)
				.in('listing_id', sellerListingIds)
				.order('created_at', { ascending: false })
				.limit(50);

			if (!bErr && bidsData) {
				incomingBids = bidsData.map((b: any) => ({
					id: b.id,
					amount: Number(b.amount),
					created_at: b.created_at,
					bidder_id: b.bidder_id,
					listing_id: b.listing_id,
					bidder_username: b.profiles?.username ?? 'Bidder',
					listing_title: b.listings?.title ?? 'Auction Item',
					listing_slug: b.listings?.slug ?? b.listing_id,
					end_date: b.listings?.end_date
				}));
			} else {
				// Fallback if join with profiles fails
				const { data: rawBids } = await db
					.from('bids')
					.select('id, amount, created_at, bidder_id, listing_id')
					.in('listing_id', sellerListingIds)
					.order('created_at', { ascending: false })
					.limit(50);

				if (rawBids) {
					incomingBids = rawBids.map((b: any) => {
						const parent = listings.find((l) => l.id === b.listing_id);
						return {
							id: b.id,
							amount: Number(b.amount),
							created_at: b.created_at,
							bidder_id: b.bidder_id,
							listing_id: b.listing_id,
							bidder_username: 'Bidder',
							listing_title: parent?.title ?? 'Auction Item',
							listing_slug: parent?.slug ?? b.listing_id,
							end_date: parent?.end_date
						};
					});
				}
			}

			// Merge serverStore bids for sellerListingIds
			const serverIncomingBids = getServerBidsForSeller(sellerListingIds);
			for (const sb of serverIncomingBids) {
				if (
					!incomingBids.some(
						(ib) => ib.id === sb.id || (ib.listing_id === sb.listing_id && ib.amount === sb.amount)
					)
				) {
					const parent = listings.find((l) => l.id === sb.listing_id);
					incomingBids.push({
						id: sb.id,
						amount: Number(sb.amount),
						created_at: sb.created_at,
						bidder_id: sb.bidder_id,
						listing_id: sb.listing_id,
						bidder_username: sb.bidder_username ?? 'Bidder',
						listing_title: sb.title ?? parent?.title ?? 'Auction Item',
						listing_slug: sb.slug ?? parent?.slug ?? sb.listing_id,
						end_date: sb.end_date ?? parent?.end_date
					});
				}
			}
			incomingBids.sort(
				(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
			);
		}
	} catch (e) {
		console.error('Error fetching incoming bids:', e);
	}

	// Calculate Sales Overview Statistics
	const totalListings = listings.length;
	const activeListings = listings.filter((l) => l.status === 'active').length;
	const soldProducts = listings.filter((l) => l.status === 'sold').length;
	const pendingRequests = purchaseRequests.filter(
		(r) => r.status === 'Pending Seller Approval'
	).length;
	const acceptedOrders = purchaseRequests.filter((r) => r.status === 'Accepted').length;
	const totalSalesValue = purchaseRequests
		.filter((r) => r.status === 'Accepted')
		.reduce((sum, r) => sum + r.price, 0);

	return {
		user: { id: user.id, email: user.email },
		listings,
		purchaseRequests,
		incomingBids,
		stats: {
			totalListings,
			activeListings,
			soldProducts,
			pendingRequests,
			acceptedOrders,
			totalSalesValue
		}
	};
};

export const actions: Actions = {
	approveRequest: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { message: 'Unauthorized' });

		const db = supabaseAdmin || locals.supabase;
		const formData = await request.formData();
		const orderId = formData.get('order_id') as string;
		const listingId = formData.get('listing_id') as string;

		if (!orderId) return fail(400, { message: 'Order ID is required' });

		// 1. Update order status to Accepted in Supabase & serverStore
		updateServerOrderStatus(orderId, 'Accepted', listingId);

		const { error: orderErr } = await db
			.from('orders')
			.update({ status: 'Accepted', updated_at: new Date().toISOString() })
			.eq('id', orderId)
			.eq('seller_id', user.id);

		if (orderErr && orderErr.code !== 'PGRST205') {
			console.warn('Supabase order approve error:', orderErr.message);
		}

		// 2. Mark product as sold
		if (listingId) {
			setListingOverride(listingId, { status: 'sold' });
			await db
				.from('listings')
				.update({ status: 'sold', updated_at: new Date().toISOString() })
				.eq('id', listingId)
				.eq('seller_id', user.id);
		}

		return { success: true, message: 'Purchase request approved! Order status updated to Accepted.' };
	},

	rejectRequest: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { message: 'Unauthorized' });

		const db = supabaseAdmin || locals.supabase;
		const formData = await request.formData();
		const orderId = formData.get('order_id') as string;
		const listingId = formData.get('listing_id') as string;

		if (!orderId) return fail(400, { message: 'Order ID is required' });

		// 1. Update order status to Rejected in Supabase & serverStore
		updateServerOrderStatus(orderId, 'Rejected', listingId);

		const { error: orderErr } = await db
			.from('orders')
			.update({ status: 'Rejected', updated_at: new Date().toISOString() })
			.eq('id', orderId)
			.eq('seller_id', user.id);

		if (orderErr && orderErr.code !== 'PGRST205') {
			console.warn('Supabase order reject error:', orderErr.message);
		}

		// 2. Restore listing to active if single-quantity
		if (listingId) {
			setListingOverride(listingId, { status: 'active' });
			await db
				.from('listings')
				.update({ status: 'active', updated_at: new Date().toISOString() })
				.eq('id', listingId)
				.eq('seller_id', user.id);
		}

		return { success: true, message: 'Purchase request rejected. Item restored to available.' };
	},

	toggleListingStatus: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { message: 'Unauthorized' });

		const db = supabaseAdmin || locals.supabase;
		const formData = await request.formData();
		const listingId = formData.get('listing_id') as string;
		const targetAction = formData.get('action') as string; // 'activate' | 'deactivate'
		const requestedStatus = formData.get('new_status') as string;

		if (!listingId) {
			return fail(400, { message: 'Invalid listing status toggle request.' });
		}

		// Fetch current listing to inspect status and dates
		const { data: currentListing } = await db
			.from('listings')
			.select('id, status, start_date, end_date')
			.eq('id', listingId)
			.eq('seller_id', user.id)
			.maybeSingle();

		if (!currentListing) {
			return fail(404, { message: 'Listing not found or unauthorized.' });
		}

		const wantActive =
			targetAction === 'activate' ||
			requestedStatus === 'active' ||
			(currentListing.status !== 'active' && targetAction !== 'deactivate');

		if (wantActive) {
			// Reactivate listing: status = 'active' and ensure end_date is in the future
			const now = new Date();
			const currentEnd = currentListing.end_date ? new Date(currentListing.end_date) : null;
			const futureEnd =
				!currentEnd || currentEnd <= now
					? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
					: currentListing.end_date;

			setListingOverride(listingId, { status: 'active' });

			const { error } = await db
				.from('listings')
				.update({
					status: 'active',
					end_date: futureEnd,
					updated_at: new Date().toISOString()
				})
				.eq('id', listingId)
				.eq('seller_id', user.id);

			if (error) {
				console.warn('Listing activate error:', error.message);
			}
			return { success: true, message: 'Listing activated and visible in the marketplace.' };
		} else {
			// Deactivate listing: try candidate statuses accepted by check constraint
			const candidates = ['ended', 'closed', 'draft', 'inactive', 'cancelled'];
			let updatedSuccessfully = false;
			let lastErrorMessage = '';

			for (const statusVal of candidates) {
				const { error } = await db
					.from('listings')
					.update({
						status: statusVal,
						updated_at: new Date().toISOString()
					})
					.eq('id', listingId)
					.eq('seller_id', user.id);

				if (!error) {
					updatedSuccessfully = true;
					setListingOverride(listingId, { status: statusVal });
					break;
				}
				lastErrorMessage = error.message;
				if (!error.message.includes('check constraint') && error.code !== '23514') {
					break;
				}
			}

			// If check constraint only allows 'active' and 'sold', expire end_date to hide from marketplace
			if (!updatedSuccessfully) {
				setListingOverride(listingId, { status: 'closed' });
				const pastDate = new Date(Date.now() - 1000).toISOString();
				const { error: dateError } = await db
					.from('listings')
					.update({
						end_date: pastDate,
						updated_at: new Date().toISOString()
					})
					.eq('id', listingId)
					.eq('seller_id', user.id);

				if (dateError) {
					console.warn('Listing deactivate date error:', dateError.message);
				}
			}

			return { success: true, message: 'Listing deactivated successfully.' };
		}
	},

	closeAndSell: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { message: 'Unauthorized' });

		const db = supabaseAdmin || locals.supabase;
		const formData = await request.formData();
		const listingId = formData.get('listing_id') as string;
		const buyerId = formData.get('buyer_id') as string;
		const buyerUsername = (formData.get('buyer_username') as string) || 'Buyer';
		const formPrice = Number(formData.get('price'));

		if (!listingId) return fail(400, { message: 'Listing ID is required' });

		// Fetch listing to verify ownership
		const { data: listing } = await db
			.from('listings')
			.select('id, seller_id, title, slug, current_price, starting_price, listing_images(image_url)')
			.eq('id', listingId)
			.eq('seller_id', user.id)
			.maybeSingle();

		if (!listing) return fail(404, { message: 'Listing not found or unauthorized' });

		let winnerId = buyerId;
		let finalPrice = formPrice;
		let winnerUsername = buyerUsername;

		if (!winnerId || !finalPrice) {
			const { data: topBid } = await db
				.from('bids')
				.select('id, amount, bidder_id, profiles(username)')
				.eq('listing_id', listingId)
				.order('amount', { ascending: false })
				.limit(1)
				.maybeSingle();

			const serverBids = getServerBids(listingId);
			const topServer = serverBids.length > 0 ? serverBids[0] : null;

			if (topBid) {
				winnerId = topBid.bidder_id;
				finalPrice = Number(topBid.amount);
				winnerUsername = (topBid.profiles as any)?.username || 'Buyer';
			} else if (topServer) {
				winnerId = topServer.bidder_id;
				finalPrice = Number(topServer.amount);
				winnerUsername = topServer.bidder_username || 'Buyer';
			}
		}

		if (!winnerId) {
			return fail(400, { message: 'Cannot close auction: no bids recorded for this listing.' });
		}

		// 1. Mark listing as sold on db and serverStore
		setListingOverride(listingId, { status: 'sold', current_price: finalPrice });

		await db
			.from('listings')
			.update({ status: 'sold', current_price: finalPrice, updated_at: new Date().toISOString() })
			.eq('id', listingId)
			.eq('seller_id', user.id);

		// 2. Insert order with Accepted status
		let orderId = crypto.randomUUID();
		try {
			const { data: insertedOrder } = await db
				.from('orders')
				.insert({
					listing_id: listingId,
					buyer_id: winnerId,
					seller_id: user.id,
					price: finalPrice,
					quantity: 1,
					status: 'Accepted'
				})
				.select('id')
				.maybeSingle();

			if (insertedOrder) {
				orderId = insertedOrder.id;
			}
		} catch (e) {
			console.error('Order insert error on seller closeAndSell:', e);
		}

		const images = listing.listing_images ?? [];
		const primaryImg = images[0]?.image_url ?? null;

		recordServerOrder({
			id: orderId,
			listing_id: listingId,
			buyer_id: winnerId,
			seller_id: user.id,
			price: finalPrice,
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
			message: `Auction closed! Item sold to @${winnerUsername} for ₹${finalPrice.toLocaleString('en-IN')}.`,
			saleDetails: {
				order_id: orderId,
				listing_id: listingId,
				seller_id: user.id,
				buyer_id: winnerId,
				buyer_username: winnerUsername,
				price: finalPrice,
				title: listing.title,
				slug: listing.slug,
				image_url: primaryImg
			}
		};
	}
};
