import fs from 'node:fs';
import path from 'node:path';

export interface ServerBid {
	id: string;
	listing_id: string;
	seller_id?: string;
	bidder_id: string;
	bidder_username?: string;
	amount: number;
	created_at: string;
	title?: string;
	slug?: string;
	image_url?: string | null;
	end_date?: string | null;
	status?: 'active' | 'outbid' | 'won' | 'closed';
}

export interface ServerOrder {
	id: string;
	listing_id: string;
	buyer_id: string;
	seller_id: string;
	price: number;
	quantity: number;
	status: 'Pending Seller Approval' | 'Accepted' | 'Rejected' | 'Cancelled';
	created_at: string;
	updated_at?: string;
	title?: string;
	slug?: string;
	image_url?: string | null;
	buyer_username?: string;
	seller_username?: string;
}

export interface ListingOverride {
	current_price?: number;
	status?: string;
	views?: number;
	updated_at: string;
}

interface StoreState {
	bids: ServerBid[];
	orders: ServerOrder[];
	listingOverrides: Record<string, ListingOverride>;
}

const STORE_FILE = path.resolve(process.cwd(), '.palmyra-server-store.json');

let inMemoryStore: StoreState = {
	bids: [],
	orders: [],
	listingOverrides: {}
};

// Load initial store from file if present
function loadStore(): StoreState {
	try {
		if (fs.existsSync(STORE_FILE)) {
			const raw = fs.readFileSync(STORE_FILE, 'utf-8');
			const parsed = JSON.parse(raw);
			return {
				bids: Array.isArray(parsed.bids) ? parsed.bids : [],
				orders: Array.isArray(parsed.orders) ? parsed.orders : [],
				listingOverrides: parsed.listingOverrides && typeof parsed.listingOverrides === 'object'
					? parsed.listingOverrides
					: {}
			};
		}
	} catch (e) {
		console.warn('[serverStore] Could not read server store file:', e);
	}
	return inMemoryStore;
}

inMemoryStore = loadStore();

function persistStore() {
	try {
		fs.writeFileSync(STORE_FILE, JSON.stringify(inMemoryStore, null, 2), 'utf-8');
	} catch (e) {
		console.warn('[serverStore] Could not write server store file:', e);
	}
}

// ── BIDS ────────────────────────────────────────────────────────

export function recordServerBid(bid: ServerBid): ServerBid {
	// Filter existing duplicate bid
	inMemoryStore.bids = inMemoryStore.bids.filter((b) => b.id !== bid.id);

	// Mark previous bids for this listing as outbid
	inMemoryStore.bids = inMemoryStore.bids.map((b) => {
		if (b.listing_id === bid.listing_id && b.id !== bid.id) {
			return {
				...b,
				status: b.status === 'won' ? 'won' : 'outbid'
			};
		}
		return b;
	});

	inMemoryStore.bids.unshift(bid);

	// Update listing current_price override
	const existingOverride = inMemoryStore.listingOverrides[bid.listing_id] || {
		updated_at: new Date().toISOString()
	};
	inMemoryStore.listingOverrides[bid.listing_id] = {
		...existingOverride,
		current_price: Math.max(Number(existingOverride.current_price || 0), Number(bid.amount)),
		updated_at: new Date().toISOString()
	};

	persistStore();
	return bid;
}

export function getServerBids(listingId: string): ServerBid[] {
	return inMemoryStore.bids.filter((b) => b.listing_id === listingId);
}

export function getServerBidsForSeller(sellerListingIds: string[]): ServerBid[] {
	if (!sellerListingIds || sellerListingIds.length === 0) return [];
	const idSet = new Set(sellerListingIds);
	return inMemoryStore.bids.filter((b) => idSet.has(b.listing_id));
}

export function getServerBidsForBidder(bidderId: string): ServerBid[] {
	return inMemoryStore.bids.filter((b) => b.bidder_id === bidderId);
}

// ── ORDERS ──────────────────────────────────────────────────────

export function recordServerOrder(order: ServerOrder): ServerOrder {
	const existing = inMemoryStore.orders.find(
		(o) => o.id === order.id || (o.listing_id === order.listing_id && o.status === 'Accepted')
	);
	if (!existing) {
		inMemoryStore.orders.unshift(order);
		persistStore();
		return order;
	}
	return existing;
}

export function updateServerOrderStatus(
	orderId: string,
	newStatus: ServerOrder['status'],
	listingId?: string
): boolean {
	let found = false;
	inMemoryStore.orders = inMemoryStore.orders.map((o) => {
		if (o.id === orderId) {
			found = true;
			return { ...o, status: newStatus, updated_at: new Date().toISOString() };
		}
		return o;
	});

	if (listingId && newStatus === 'Accepted') {
		inMemoryStore.listingOverrides[listingId] = {
			...(inMemoryStore.listingOverrides[listingId] || { updated_at: new Date().toISOString() }),
			status: 'sold',
			updated_at: new Date().toISOString()
		};
	} else if (listingId && newStatus === 'Rejected') {
		inMemoryStore.listingOverrides[listingId] = {
			...(inMemoryStore.listingOverrides[listingId] || { updated_at: new Date().toISOString() }),
			status: 'active',
			updated_at: new Date().toISOString()
		};
	}

	persistStore();
	return found;
}

export function getServerOrdersForSeller(sellerId: string): ServerOrder[] {
	return inMemoryStore.orders.filter((o) => o.seller_id === sellerId);
}

export function getServerOrdersForBuyer(buyerId: string): ServerOrder[] {
	return inMemoryStore.orders.filter((o) => o.buyer_id === buyerId);
}

// ── LISTING OVERRIDES ───────────────────────────────────────────

export function getListingOverride(listingId: string): ListingOverride | undefined {
	return inMemoryStore.listingOverrides[listingId];
}

export function setListingOverride(listingId: string, override: Partial<ListingOverride>) {
	inMemoryStore.listingOverrides[listingId] = {
		...(inMemoryStore.listingOverrides[listingId] || { updated_at: new Date().toISOString() }),
		...override,
		updated_at: new Date().toISOString()
	};
	persistStore();
}

/**
 * Merges serverStore overrides (latest bids, status, views) onto a listing object
 */
export function applyListingOverrides(listing: any): any {
	if (!listing || !listing.id) return listing;
	const override = inMemoryStore.listingOverrides[listing.id];
	const serverBids = getServerBids(listing.id);
	const topBid = serverBids.length > 0 ? Number(serverBids[0].amount) : 0;
	const highestPrice = Math.max(
		topBid,
		Number(override?.current_price ?? 0),
		Number(listing.current_price ?? listing.starting_price ?? 0)
	);

	return {
		...listing,
		status: override?.status ?? listing.status,
		current_price: highestPrice,
		bid_count: Math.max(listing.bid_count ?? 0, serverBids.length)
	};
}

/**
 * Merges serverStore overrides onto an array of listing objects
 */
export function applyListingOverridesToList(listings: any[]): any[] {
	if (!Array.isArray(listings)) return [];
	return listings.map(applyListingOverrides);
}
