import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/auth/signin?next=/dashboard/seller');

	let listings: any[] = [];
	let purchaseRequests: any[] = [];
	let incomingBids: any[] = [];

	// 1. Fetch seller listings
	try {
		const { data: listingsData, error: lErr } = await locals.supabase
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
				return {
					...l,
					primary_image: primary?.image_url ?? null
				};
			});
		}
	} catch (e) {
		console.error('Error fetching seller listings:', e);
	}

	// 2. Fetch incoming purchase requests (orders where seller_id = user.id)
	try {
		const { data: ordersData, error: oErr } = await locals.supabase
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

	// 3. Fetch incoming bids on seller's listings
	try {
		const sellerListingIds = listings.map((l) => l.id);
		if (sellerListingIds.length > 0) {
			const { data: bidsData, error: bErr } = await locals.supabase
				.from('bids')
				.select(
					`
          id, amount, created_at, bidder_id, listing_id,
          listings(id, title, slug, current_price, end_date),
          profiles:profiles!bids_bidder_id_fkey(username)
        `
				)
				.in('listing_id', sellerListingIds)
				.order('created_at', { ascending: false })
				.limit(20);

			if (!bErr && bidsData) {
				incomingBids = bidsData.map((b: any) => ({
					id: b.id,
					amount: Number(b.amount),
					created_at: b.created_at,
					bidder_username: b.profiles?.username ?? 'Bidder',
					listing_title: b.listings?.title ?? 'Auction Item',
					listing_slug: b.listings?.slug ?? b.listing_id,
					end_date: b.listings?.end_date
				}));
			}
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

		const formData = await request.formData();
		const orderId = formData.get('order_id') as string;
		const listingId = formData.get('listing_id') as string;

		if (!orderId) return fail(400, { message: 'Order ID is required' });

		// 1. Update order status to Accepted
		const { error: orderErr } = await locals.supabase
			.from('orders')
			.update({ status: 'Accepted', updated_at: new Date().toISOString() })
			.eq('id', orderId)
			.eq('seller_id', user.id);

		if (orderErr && orderErr.code !== 'PGRST205') {
			return fail(500, { message: `Failed to approve order: ${orderErr.message}` });
		}

		// 2. Mark product as sold to prevent further purchases
		if (listingId) {
			await locals.supabase
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

		const formData = await request.formData();
		const orderId = formData.get('order_id') as string;
		const listingId = formData.get('listing_id') as string;

		if (!orderId) return fail(400, { message: 'Order ID is required' });

		// 1. Update order status to Rejected
		const { error: orderErr } = await locals.supabase
			.from('orders')
			.update({ status: 'Rejected', updated_at: new Date().toISOString() })
			.eq('id', orderId)
			.eq('seller_id', user.id);

		if (orderErr && orderErr.code !== 'PGRST205') {
			return fail(500, { message: `Failed to reject order: ${orderErr.message}` });
		}

		// 2. If listing is currently single-quantity and was marked sold or pending, ensure it is active
		if (listingId) {
			await locals.supabase
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

		const formData = await request.formData();
		const listingId = formData.get('listing_id') as string;
		const newStatus = formData.get('new_status') as string;

		if (!listingId || !newStatus) {
			return fail(400, { message: 'Invalid listing status toggle request.' });
		}

		const { error } = await locals.supabase
			.from('listings')
			.update({ status: newStatus, updated_at: new Date().toISOString() })
			.eq('id', listingId)
			.eq('seller_id', user.id);

		if (error) {
			return fail(500, { message: `Failed to update status: ${error.message}` });
		}

		return { success: true, message: `Listing status updated to ${newStatus}.` };
	}
};
