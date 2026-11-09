import { supabase } from '$lib/supabaseClient';

export interface CartItem {
	id: string;
	listing_id: string;
	title: string;
	price: number;
	image_url: string | null;
	seller_id: string;
	seller_username?: string;
	quantity: number;
	slug: string;
}

const LOCAL_STORAGE_KEY = 'palmyra_cart';

export function getLocalCart(): CartItem[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

export function saveLocalCart(items: CartItem[]) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
		window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: items.length } }));
	} catch {
		// ignore
	}
}

export async function addToCart(listing: {
	id: string;
	title: string;
	price: number;
	image_url?: string | null;
	seller_id?: string;
	seller_username?: string;
	slug: string;
}): Promise<{ success: boolean; message: string }> {
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		return { success: false, message: 'Please sign in to add items to your cart.' };
	}

	if (listing.seller_id && user.id === listing.seller_id) {
		return { success: false, message: 'You cannot add your own product to the cart.' };
	}

	// Try inserting into Supabase
	let insertedInDb = false;
	try {
		const { error } = await supabase.from('cart_items').insert({
			user_id: user.id,
			listing_id: listing.id,
			quantity: 1
		});

		if (!error) {
			insertedInDb = true;
		} else if (error.code === '23505') {
			// duplicate key
			return { success: false, message: 'This item is already in your cart.' };
		}
	} catch {
		// Table might not exist yet, fallback to localStorage
	}

	// Always sync local cart for instant UI responsiveness
	const current = getLocalCart();
	const existing = current.find((i) => i.listing_id === listing.id);
	if (existing) {
		return { success: false, message: 'This item is already in your cart.' };
	}

	const newItem: CartItem = {
		id: crypto.randomUUID(),
		listing_id: listing.id,
		title: listing.title,
		price: listing.price,
		image_url: listing.image_url ?? null,
		seller_id: listing.seller_id ?? '',
		seller_username: listing.seller_username ?? 'Seller',
		quantity: 1,
		slug: listing.slug
	};

	saveLocalCart([...current, newItem]);
	return { success: true, message: 'Added to cart successfully!' };
}

export async function removeFromCart(listingId: string): Promise<boolean> {
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (user) {
		try {
			await supabase.from('cart_items').delete().eq('user_id', user.id).eq('listing_id', listingId);
		} catch {
			// ignore
		}
	}

	const current = getLocalCart();
	saveLocalCart(current.filter((i) => i.listing_id !== listingId));
	return true;
}

export async function clearCart(): Promise<void> {
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (user) {
		try {
			await supabase.from('cart_items').delete().eq('user_id', user.id);
		} catch {
			// ignore
		}
	}

	saveLocalCart([]);
}
