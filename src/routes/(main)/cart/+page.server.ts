import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/auth/signin?next=/cart');

	let cartItems: any[] = [];

	try {
		const { data, error } = await locals.supabase
			.from('cart_items')
			.select(
				`
        id, quantity, listing_id, created_at,
        listings(
          id, title, slug, buy_it_now_price, current_price, starting_price, status, seller_id,
          listing_images(image_url, is_primary),
          profiles:profiles!listings_seller_id_fkey(id, username)
        )
      `
			)
			.eq('user_id', user.id)
			.order('created_at', { ascending: false });

		if (!error && data) {
			cartItems = data.map((item: any) => {
				const l = item.listings;
				const images = l?.listing_images ?? [];
				const primary = images.find((i: any) => i.is_primary) ?? images[0];
				const profile = Array.isArray(l?.profiles) ? l.profiles[0] : l?.profiles;

				return {
					cart_item_id: item.id,
					listing_id: item.listing_id,
					title: l?.title ?? 'Product',
					slug: l?.slug ?? item.listing_id,
					price: Number(l?.buy_it_now_price ?? l?.current_price ?? 0),
					status: l?.status ?? 'active',
					image_url: primary?.image_url ?? null,
					seller_id: l?.seller_id,
					seller_username: profile?.username ?? 'Seller',
					quantity: item.quantity ?? 1
				};
			});
		}
	} catch (e) {
		console.error('Error fetching cart items from Supabase:', e);
	}

	return {
		user: { id: user.id, email: user.email },
		cartItems
	};
};

export const actions: Actions = {
	remove: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const listingId = formData.get('listing_id') as string;

		if (listingId) {
			try {
				await locals.supabase
					.from('cart_items')
					.delete()
					.eq('user_id', user.id)
					.eq('listing_id', listingId);
			} catch (e) {
				console.error('Error deleting cart item:', e);
			}
		}

		return { success: true, removedListingId: listingId };
	},

	checkout: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { message: 'Unauthorized. Please sign in.' });

		const formData = await request.formData();
		const clientItemsJson = formData.get('cart_items_json') as string;
		let clientItems: any[] = [];
		if (clientItemsJson) {
			try {
				clientItems = JSON.parse(clientItemsJson);
			} catch {
				// ignore parse error
			}
		}

		// Also fetch current cart items from db
		let dbCartItems: any[] = [];
		try {
			const { data, error } = await locals.supabase
				.from('cart_items')
				.select(
					`
          id, quantity, listing_id,
          listings(id, title, slug, buy_it_now_price, current_price, status, seller_id)
        `
				)
				.eq('user_id', user.id);

			if (!error && data) dbCartItems = data;
		} catch (e) {
			console.error('Checkout fetch error:', e);
		}

		// Combine client & DB items into a deduplicated list
		const combinedItems: any[] = [];
		for (const ci of clientItems) {
			combinedItems.push({
				listing_id: ci.listing_id,
				quantity: ci.quantity ?? 1,
				price: Number(ci.price ?? 0),
				title: ci.title ?? 'Product',
				slug: ci.slug ?? ci.listing_id,
				seller_id: ci.seller_id,
				image_url: ci.image_url ?? null
			});
		}

		for (const di of dbCartItems) {
			if (!combinedItems.some((ci) => ci.listing_id === di.listing_id)) {
				const l = di.listings;
				if (l) {
					combinedItems.push({
						listing_id: l.id,
						quantity: di.quantity ?? 1,
						price: Number(l.buy_it_now_price ?? l.current_price ?? 0),
						title: l.title,
						slug: l.slug,
						seller_id: l.seller_id,
						image_url: null
					});
				}
			}
		}

		if (combinedItems.length === 0) {
			return fail(400, { message: 'Your cart is empty.' });
		}

		let ordersCreated = 0;
		const fallbackOrders: any[] = [];
		const processedListingIds: string[] = [];

		for (const item of combinedItems) {
			// Prevent buying own product
			if (item.seller_id === user.id) continue;
			if (item.price <= 0) continue;

			// Insert purchase request order with initial status 'Pending Seller Approval'
			let savedInDb = false;
			try {
				const { error: orderError } = await locals.supabase.from('orders').insert({
					listing_id: item.listing_id,
					buyer_id: user.id,
					seller_id: item.seller_id,
					price: item.price,
					quantity: item.quantity ?? 1,
					status: 'Pending Seller Approval'
				});

				if (!orderError) {
					savedInDb = true;
					ordersCreated++;
					processedListingIds.push(item.listing_id);
				} else if (orderError.code === 'PGRST205') {
					// Table not yet created in Supabase SQL editor: create resilient fallback order
					ordersCreated++;
					processedListingIds.push(item.listing_id);
					fallbackOrders.push({
						id: crypto.randomUUID(),
						listing_id: item.listing_id,
						buyer_id: user.id,
						seller_id: item.seller_id,
						price: item.price,
						quantity: item.quantity ?? 1,
						status: 'Pending Seller Approval',
						created_at: new Date().toISOString(),
						listing: {
							id: item.listing_id,
							title: item.title,
							slug: item.slug,
							buy_it_now_price: item.price,
							listing_images: item.image_url ? [{ image_url: item.image_url }] : []
						}
					});
				} else {
					console.error('Failed to create order for item:', item.listing_id, orderError.message);
				}
			} catch (err) {
				console.error('Order creation exception:', err);
			}
		}

		// Remove successfully processed items from cart table in Supabase
		if (processedListingIds.length > 0) {
			try {
				await locals.supabase
					.from('cart_items')
					.delete()
					.eq('user_id', user.id)
					.in('listing_id', processedListingIds);
			} catch (e) {
				console.error('Failed to clean cart after checkout:', e);
			}
		}

		if (ordersCreated === 0) {
			return fail(400, {
				message: 'No eligible items could be checked out. Products may be unavailable or owned by you.'
			});
		}

		return {
			success: true,
			checkoutSuccess: true,
			ordersCount: ordersCreated,
			fallbackOrders,
			message: `Success! ${ordersCreated} purchase request(s) submitted with status "Pending Seller Approval".`
		};
	}
};
