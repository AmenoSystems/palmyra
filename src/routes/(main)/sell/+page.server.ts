import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	CANONICAL_CATEGORIES,
	CANONICAL_SUBCATEGORIES,
	type Category,
	type Subcategory
} from '$lib/constants/categories';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/auth/signin?next=/sell');

	// Attempt loading categories from database; fallback to canonical list if table is empty
	let categories: Category[] = CANONICAL_CATEGORIES;
	let subcategories: Subcategory[] = CANONICAL_SUBCATEGORIES;

	try {
		const { data: dbCats, error: catError } = await locals.supabase
			.from('categories')
			.select('id, name, slug')
			.order('name');

		if (!catError && dbCats && dbCats.length > 0) {
			categories = dbCats;
		}

		const { data: dbSubcats, error: subError } = await locals.supabase
			.from('subcategories')
			.select('id, category_id, name, slug')
			.order('name');

		if (!subError && dbSubcats && dbSubcats.length > 0) {
			subcategories = dbSubcats;
		}
	} catch (err) {
		console.warn('Using canonical categories fallback:', err);
	}

	return {
		user: { id: user.id, email: user.email! },
		categories,
		subcategories
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { message: 'Unauthorized. Please sign in.' });

		const formData = await request.formData();

		const title = (formData.get('title') as string)?.trim();
		const description = (formData.get('description') as string)?.trim();
		const subcategoryId = (formData.get('subcategory_id') as string)?.trim();
		const condition = (formData.get('condition') as string)?.trim();
		const startingPrice = parseFloat(formData.get('starting_price') as string);
		const buyItNowPrice = formData.get('buy_it_now_price')
			? parseFloat(formData.get('buy_it_now_price') as string)
			: null;
		const reservePrice = formData.get('reserve_price')
			? parseFloat(formData.get('reserve_price') as string)
			: null;
		const quantity = parseInt(formData.get('quantity') as string) || 1;
		const startDate = formData.get('start_date') as string;
		const endDate = formData.get('end_date') as string;
		const tagsRaw = (formData.get('tags') as string)?.trim();

		// Validation
		if (!title || !description || !condition || isNaN(startingPrice) || !startDate || !endDate) {
			return fail(400, { message: 'Please fill in all required fields.' });
		}

		if (title.length < 3) {
			return fail(400, { message: 'Title must be at least 3 characters.' });
		}

		if (description.length < 10) {
			return fail(400, { message: 'Description must be at least 10 characters.' });
		}

		if (startingPrice <= 0) {
			return fail(400, { message: 'Starting price must be greater than zero.' });
		}

		// Find chosen subcategory and category (from DB or canonical list)
		let matchedSub = CANONICAL_SUBCATEGORIES.find((s) => s.id === subcategoryId || s.slug === subcategoryId);
		let matchedCat = matchedSub
			? CANONICAL_CATEGORIES.find((c) => c.id === matchedSub?.category_id)
			: undefined;

		// Check if the subcategory actually exists in the database
		let dbSubcategoryExists = false;
		if (subcategoryId) {
			try {
				const { data: dbSub } = await locals.supabase
					.from('subcategories')
					.select('id, category_id, name, slug')
					.eq('id', subcategoryId)
					.maybeSingle();

				if (dbSub) {
					dbSubcategoryExists = true;
					matchedSub = dbSub;
					const { data: dbCat } = await locals.supabase
						.from('categories')
						.select('id, name, slug')
						.eq('id', dbSub.category_id)
						.maybeSingle();
					if (dbCat) matchedCat = dbCat;
				}
			} catch {
				dbSubcategoryExists = false;
			}
		}

		// Generate URL slug
		const slug = generateSlug(title);

		// Prepare listing payload
		// If subcategory exists in DB, use its UUID; otherwise null to prevent foreign key violation
		const listingPayload: Record<string, any> = {
			seller_id: user.id,
			title,
			slug,
			description,
			condition,
			starting_price: startingPrice,
			current_price: startingPrice,
			buy_it_now_price: buyItNowPrice,
			reserve_price: reservePrice,
			quantity,
			status: 'active',
			start_date: new Date(startDate).toISOString(),
			end_date: new Date(endDate).toISOString()
		};

		if (dbSubcategoryExists) {
			listingPayload.subcategory_id = subcategoryId;
		}

		// Insert listing with fallback for foreign key constraints
		let listing: { id: string; slug: string } | null = null;
		const { data: insertedListing, error: listingError } = await locals.supabase
			.from('listings')
			.insert(listingPayload)
			.select('id, slug')
			.single();

		if (listingError) {
			// If insertion failed due to foreign key constraint on subcategory_id, retry with null
			if (listingPayload.subcategory_id) {
				delete listingPayload.subcategory_id;
				const { data: retryListing, error: retryError } = await locals.supabase
					.from('listings')
					.insert(listingPayload)
					.select('id, slug')
					.single();

				if (retryError) {
					console.error('Listing retry error:', retryError.message);
					return fail(500, { message: `Failed to create listing: ${retryError.message}` });
				}
				listing = retryListing;
			} else {
				console.error('Listing insert error:', listingError.message);
				return fail(500, { message: `Failed to create listing: ${listingError.message}` });
			}
		} else {
			listing = insertedListing;
		}

		if (!listing) {
			return fail(500, { message: 'Failed to create listing. Please try again.' });
		}

		// Insert images (URLs were uploaded from client to Supabase Storage)
		const imagesJson = formData.get('images_json') as string;
		if (imagesJson) {
			try {
				const imageRecords = JSON.parse(imagesJson) as {
					url: string;
					isPrimary: boolean;
					displayOrder: number;
				}[];

				if (imageRecords.length > 0) {
					const { error: imgError } = await locals.supabase.from('listing_images').insert(
						imageRecords.map((img) => ({
							listing_id: listing!.id,
							image_url: img.url,
							is_primary: img.isPrimary,
							display_order: img.displayOrder
						}))
					);
					if (imgError) console.error('Image insert error:', imgError.message);
				}
			} catch (err) {
				console.error('Failed to parse images JSON:', err);
			}
		}

		// Insert tags (including category and subcategory tags for instant filtering)
		const tagsList: string[] = [];

		if (matchedCat) {
			tagsList.push(matchedCat.slug.toLowerCase());
			tagsList.push(matchedCat.name.toLowerCase());
		}
		if (matchedSub) {
			tagsList.push(matchedSub.slug.toLowerCase());
			tagsList.push(matchedSub.name.toLowerCase());
		}

		if (tagsRaw) {
			const userTags = tagsRaw
				.split(',')
				.map((t) => t.trim().toLowerCase())
				.filter(Boolean);
			tagsList.push(...userTags);
		}

		const uniqueTags = Array.from(new Set(tagsList)).slice(0, 15);
		if (uniqueTags.length > 0) {
			try {
				const { error: tagError } = await locals.supabase
					.from('listing_tags')
					.insert(uniqueTags.map((tag) => ({ listing_id: listing!.id, tag })));
				if (tagError) console.error('Tag insert error:', tagError.message);
			} catch (tagErr) {
				console.error('Error inserting tags:', tagErr);
			}
		}

		redirect(303, `/listings/${listing.slug}`);
	}
};

function generateSlug(title: string): string {
	const base = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
	const suffix = Math.random().toString(36).substring(2, 8);
	return `${base}-${suffix}`;
}
