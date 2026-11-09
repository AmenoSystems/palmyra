import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/auth/signin?next=/dashboard/buyer');

	let purchases: any[] = [];
	let myBids: any[] = [];

	// 1. Fetch user orders / purchases
	try {
		const { data: ordersData, error: ordersErr } = await locals.supabase
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

	// 2. Fetch user's bids
	try {
		const { data: bidsData, error: bidsErr } = await locals.supabase
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
			// Deduplicate by listing to show user's latest bid per listing
			const seenListings = new Set<string>();
			for (const b of bidsData) {
				if (!b.listings || seenListings.has(b.listing_id)) continue;
				seenListings.add(b.listing_id);

				const rawL = b.listings;
				const l: any = Array.isArray(rawL) ? rawL[0] : rawL;
				if (!l) continue;
				const images = l.listing_images ?? [];
				const primary = images.find((i: any) => i.is_primary) ?? images[0];
				const currentPrice = Number(l.current_price ?? l.starting_price ?? 0);
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
					listing_status: l.status
				});
			}
		}
	} catch (e) {
		console.error('Error fetching bids:', e);
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

		const formData = await request.formData();
		const orderId = formData.get('order_id') as string;

		if (!orderId) return fail(400, { message: 'Order ID is required' });

		const { error } = await locals.supabase
			.from('orders')
			.update({ status: 'Cancelled', updated_at: new Date().toISOString() })
			.eq('id', orderId)
			.eq('buyer_id', user.id)
			.eq('status', 'Pending Seller Approval');

		if (error) {
			return fail(500, { message: `Failed to cancel order: ${error.message}` });
		}

		return { success: true, message: 'Purchase request cancelled successfully.' };
	}
};
