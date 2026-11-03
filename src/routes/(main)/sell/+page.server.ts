import { redirect, fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/auth/signin?next=/sell');

	// Load categories + subcategories for cascading dropdowns
	const { data: categories, error: catError } = await locals.supabase
		.from('categories')
		.select('id, name, slug')
		.order('name');

	if (catError) {
		console.error('Failed to load categories:', catError.message);
		error(500, 'Failed to load categories');
	}

	const { data: subcategories, error: subError } = await locals.supabase
		.from('subcategories')
		.select('id, category_id, name, slug')
		.order('name');

	if (subError) {
		console.error('Failed to load subcategories:', subError.message);
		error(500, 'Failed to load subcategories');
	}

	return {
		user: { id: user.id, email: user.email! },
		categories: categories ?? [],
		subcategories: subcategories ?? []
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();

		const title = (formData.get('title') as string)?.trim();
		const description = (formData.get('description') as string)?.trim();
		const subcategoryId = formData.get('subcategory_id') as string;
		const condition = formData.get('condition') as string;
		const startingPrice = parseFloat(formData.get('starting_price') as string);
		const buyItNowPrice = formData.get('buy_it_now_price') ? parseFloat(formData.get('buy_it_now_price') as string) : null;
		const reservePrice = formData.get('reserve_price') ? parseFloat(formData.get('reserve_price') as string) : null;
		const quantity = parseInt(formData.get('quantity') as string) || 1;
		const startDate = formData.get('start_date') as string;
		const endDate = formData.get('end_date') as string;
		const tagsRaw = (formData.get('tags') as string)?.trim();

		// Validation
		if (!title || !description || !subcategoryId || !condition || isNaN(startingPrice) || !startDate || !endDate) {
			return fail(400, { message: 'Please fill in all required fields.' });
		}

		// Generate slug
		const slug = generateSlug(title);

		// Insert listing
		const { data: listing, error: listingError } = await locals.supabase
			.from('listings')
			.insert({
				seller_id: user.id,
				subcategory_id: subcategoryId,
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
			})
			.select('id, slug')
			.single();

		if (listingError) {
			console.error('Listing insert error:', listingError.message);
			return fail(500, { message: 'Failed to create listing. Please try again.' });
		}

		// Insert images (URLs were uploaded from client and passed as JSON)
		const imagesJson = formData.get('images_json') as string;
		if (imagesJson) {
			try {
				const imageRecords = JSON.parse(imagesJson) as {
					url: string; isPrimary: boolean; displayOrder: number;
				}[];

				if (imageRecords.length > 0) {
					const { error: imgError } = await locals.supabase
						.from('listing_images')
						.insert(
							imageRecords.map(img => ({
								listing_id: listing.id,
								image_url: img.url,
								is_primary: img.isPrimary,
								display_order: img.displayOrder
							}))
						);
					if (imgError) console.error('Image insert error:', imgError.message);
				}
			} catch {
				console.error('Failed to parse images JSON');
			}
		}

		// Insert tags
		if (tagsRaw) {
			const tags = tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 10);
			if (tags.length > 0) {
				const { error: tagError } = await locals.supabase
					.from('listing_tags')
					.insert(tags.map(tag => ({ listing_id: listing.id, tag })));
				if (tagError) console.error('Tag insert error:', tagError.message);
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
