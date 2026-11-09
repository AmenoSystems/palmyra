import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import {
	getServerOrdersForBuyer,
	getServerBidsForBidder,
	getListingOverride,
	updateServerOrderStatus
} from '$lib/server/serverStore';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/auth/signin?next=/dashboard/buyer');

	const db = supabaseAdmin || locals.supabase;

	let purchases: any[] = [];
	let myBids: any[] = [];

	// 1. Fetch user orders / purchases
	try {
		const { data: ordersData, error: ordersErr } = await db
			.from('orders')
			.select(
				`
        id, price, quantity, status, created_at, updated_at, listing_id,
        listings(id, title, slug, listing_images(image_url, is_primary)),
        profiles:profiles!orders_seller_id_fkey(id, username, full_name)
      `
			)
			.eq('buyer_id', user.id)
			.order('created_at', { ascending: false });

		if (!ordersErr && ordersData) {
			purchases = ordersData.map((o: any) => {
				const l = o.listings;
				const images = l?.listing_images ?? [];
				const primary = images.find((i: any) => i.is_primary) ?? images[0];
				const sellerProfile = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;

				return {
					id: o.id,
					listing_id: o.listing_id,
					title: l?.title ?? 'Product',
					slug: l?.slug ?? o.listing_id,
					image_url: primary?.image_url ?? null,
					price: Number(o.price),
					status: o.status,
					created_at: o.created_at,
					seller_username: sellerProfile?.username ?? 'Seller'
				};
			});
		}
	} catch (e) {
		console.error('Error fetching purchases:', e);
	}

	// Merge serverStore orders for buyer
	const serverOrders = getServerOrdersForBuyer(user.id);
	for (const so of serverOrders) {
		if (!purchases.some((p) => p.id === so.id || p.listing_id === so.listing_id)) {
			purchases.push({
				id: so.id,
				listing_id: so.listing_id,
				title: so.title ?? 'Product',
				slug: so.slug ?? so.listing_id,
				image_url: so.image_url ?? null,
				price: Number(so.price),
				status: so.status,
				created_at: so.created_at,
				seller_username: so.seller_username ?? 'Seller'
			});
		}
	}

	// Deduplicate purchases so each listing appears at most once in purchases
	const seenPurchasedListings = new Set<string>();
	const deduplicatedPurchases: any[] = [];
	for (const p of purchases) {
		if (!seenPurchasedListings.has(p.listing_id)) {
			seenPurchasedListings.add(p.listing_id);
			deduplicatedPurchases.push(p);
		}
	}
	purchases = deduplicatedPurchases;

	// 2. Fetch user's bids
	try {
		const { data: bidsData, error: bidsErr } = await db
			.from('bids')
			.select(
				`
        id, amount, created_at, status, listing_id,
        listings(
          id, title, slug, current_price, starting_price, end_date, status, winner_id,
          listing_images(image_url, is_primary)
        )
      `
			)
			.eq('bidder_id', user.id)
			.order('created_at', { ascending: false });

		if (!bidsErr && bidsData) {
			const seenListings = new Set<string>();
			for (const b of bidsData) {
				if (!b.listings || seenListings.has(b.listing_id)) continue;
				seenListings.add(b.listing_id);

				const rawL = b.listings;
				const l: any = Array.isArray(rawL) ? rawL[0] : rawL;
				if (!l) continue;
				const images = l.listing_images ?? [];
				const primary = images.find((i: any) => i.is_primary) ?? images[0];
				const override = getListingOverride(b.listing_id);
				const currentPrice = Math.max(
					Number(override?.current_price ?? 0),
					Number(l.current_price ?? l.starting_price ?? 0)
				);
				const userAmount = Number(b.amount);
				const isEnded = l.end_date ? new Date(l.end_date) < new Date() : false;
				const isWinning = userAmount >= currentPrice && (!isEnded || l.winner_id === user.id);

				myBids.push({
					bid_id: b.id,
					listing_id: b.listing_id,
					title: l.title,
					slug: l.slug,
					image_url: primary?.image_url ?? null,
					my_bid: userAmount,
					current_highest: currentPrice,
					end_date: l.end_date,
					is_ended: isEnded,
					is_winning: isWinning,
					listing_status: override?.status ?? l.status
				});
			}
		}
	} catch (e) {
		console.error('Error fetching bids:', e);
	}

	// Merge serverStore bids for buyer
	const serverBids = getServerBidsForBidder(user.id);
	for (const sb of serverBids) {
		const existingIdx = myBids.findIndex((b) => b.listing_id === sb.listing_id);
		const override = getListingOverride(sb.listing_id);
		const currentHighest = Math.max(
			Number(override?.current_price ?? 0),
			Number(sb.amount)
		);
		const isWinning = Number(sb.amount) >= currentHighest;

		if (existingIdx === -1) {
			myBids.push({
				bid_id: sb.id,
				listing_id: sb.listing_id,
				title: sb.title ?? 'Auction Item',
				slug: sb.slug ?? sb.listing_id,
				image_url: sb.image_url ?? null,
				my_bid: Number(sb.amount),
				current_highest: currentHighest,
				end_date: sb.end_date,
				is_ended: sb.end_date ? new Date(sb.end_date) < new Date() : false,
				is_winning: sb.status === 'won' || (isWinning && sb.status !== 'outbid'),
				status: sb.status ?? 'active',
				listing_status: override?.status ?? 'active'
			});
		} else {
			if (Number(sb.amount) > myBids[existingIdx].my_bid) {
				myBids[existingIdx].my_bid = Number(sb.amount);
			}
			myBids[existingIdx].current_highest = currentHighest;
			if (sb.status === 'won') {
				myBids[existingIdx].is_winning = true;
				myBids[existingIdx].status = 'won';
			}
		}
	}

	return {
		user: { id: user.id, email: user.email },
		purchases,
		myBids
	};
};

export const actions: Actions = {
	cancelOrder: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { message: 'Unauthorized' });

		const db = supabaseAdmin || locals.supabase;
		const formData = await request.formData();
		const orderId = formData.get('order_id') as string;

		if (!orderId) return fail(400, { message: 'Order ID is required' });

		updateServerOrderStatus(orderId, 'Cancelled');

		const { error } = await db
			.from('orders')
			.update({ status: 'Cancelled', updated_at: new Date().toISOString() })
			.eq('id', orderId)
			.eq('buyer_id', user.id)
			.eq('status', 'Pending Seller Approval');

		if (error && error.code !== 'PGRST205') {
			return fail(500, { message: `Failed to cancel order: ${error.message}` });
		}

		return { success: true, message: 'Purchase request cancelled successfully.' };
	}
};
