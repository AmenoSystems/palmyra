import { supabase } from '$lib/supabaseClient';

export interface OrderRecord {
	id: string;
	listing_id: string;
	buyer_id: string;
	seller_id: string;
	price: number;
	quantity: number;
	status: 'Pending Seller Approval' | 'Accepted' | 'Rejected' | 'Cancelled';
	created_at: string;
	updated_at?: string;
	listing?: {
		id?: string;
		title: string;
		slug: string;
		buy_it_now_price?: number;
		listing_images?: { image_url: string }[];
	};
	seller?: {
		username?: string;
		full_name?: string;
	};
	buyer?: {
		username?: string;
		full_name?: string;
	};
}

const LOCAL_STORAGE_ORDERS_KEY = 'palmyra_orders';

export function getLocalOrders(): OrderRecord[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

export function saveLocalOrders(orders: OrderRecord[]) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
		window.dispatchEvent(new CustomEvent('orders-updated', { detail: { count: orders.length } }));
	} catch {
		// ignore
	}
}

export function addLocalOrder(order: OrderRecord) {
	const current = getLocalOrders();
	// Check duplicate
	const exists = current.some((o) => o.id === order.id || (o.listing_id === order.listing_id && o.buyer_id === order.buyer_id && o.status === 'Pending Seller Approval'));
	if (!exists) {
		saveLocalOrders([order, ...current]);
	}
}

export function updateLocalOrderStatus(orderId: string, newStatus: OrderRecord['status']) {
	const current = getLocalOrders();
	const updated = current.map((o) => {
		if (o.id === orderId) {
			return { ...o, status: newStatus, updated_at: new Date().toISOString() };
		}
		return o;
	});
	saveLocalOrders(updated);
}

export interface LocalBidRecord {
	id: string;
	listing_id: string;
	bidder_id: string;
	amount: number;
	created_at: string;
	title?: string;
	slug?: string;
	image_url?: string | null;
	current_highest?: number;
	end_date?: string | null;
	is_winning?: boolean;
}

const LOCAL_STORAGE_BIDS_KEY = 'palmyra_bids';

export function getLocalBids(): LocalBidRecord[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(LOCAL_STORAGE_BIDS_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

export function saveLocalBids(bids: LocalBidRecord[]) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(LOCAL_STORAGE_BIDS_KEY, JSON.stringify(bids));
		window.dispatchEvent(new CustomEvent('bids-updated', { detail: { count: bids.length } }));
	} catch {
		// ignore
	}
}

export function addLocalBid(bid: LocalBidRecord) {
	const current = getLocalBids();
	const filtered = current.filter((b) => b.listing_id !== bid.listing_id);
	saveLocalBids([bid, ...filtered]);
}

