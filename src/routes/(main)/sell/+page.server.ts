import { redirect, fail } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { PageServerLoad, Actions } from './$types';

const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/signin?next=/sell');

	const [cats, subs] = await Promise.all([
		locals.supabase.from('categories').select('id, name, slug').order('name'),
		locals.supabase.from('subcategories').select('id, category_id, name, slug').order('name')
	]);
	if (cats.error) console.error(cats.error);
	if (subs.error) console.error(subs.error);
	return {
		user: { id: user.id },
		categories: cats.data ?? [],
		subcategories: subs.data ?? []
	};
};

function slugify(s: string) {
	const base = s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
	return `${base || 'item'}-${Math.random().toString(36).slice(2, 8)}`;
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		console.log('SELL ACTION HIT');
		const user = await locals.getUser();
		if (!user) return fail(401, { message: 'Unauthorized. Please sign in.' });

		const formData = await request.formData();

		const title = (formData.get('title') as string)?.trim();
		const description = (formData.get('description') as string)?.trim();
		const subcategoryId = formData.get('subcategory_id') as string;
		const condition = formData.get('condition') as string;
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
		if (!title) return fail(400, { message: 'Item title is required.' });
		if (!description) return fail(400, { message: 'Item description is required.' });
		if (!subcategoryId) return fail(400, { message: 'Please select a category and subcategory.' });
		if (!condition) return fail(400, { message: 'Please select item condition.' });
		if (isNaN(startingPrice) || startingPrice <= 0) {
			return fail(400, { message: 'Please provide a valid starting price greater than 0.' });
		}
		if (!startDate || !endDate) {
			return fail(400, { message: 'Start date and end date are required.' });
		}

		// Generate clean slug
		const slug = generateSlug(title);

		// Insert listing into Supabase
		const { data: listing, error: listingError } = await locals.supabase
			.from('listings')
			.insert({
				seller_id: user.id, subcategory_id: subcategoryId, title, slug: slugify(title),
				description, condition, starting_price: startingPrice, current_price: startingPrice,
				buy_it_now_price: buyNow, reserve_price: reserve, quantity, status: 'draft',
				start_date: start.toISOString(), end_date: end.toISOString()
			})
			.select('id, slug')
			.single();

		if (listingError) {
			console.error('Listing insert error:', listingError.message);
			return fail(500, { message: `Failed to create listing: ${listingError.message}` });
		}

		// Insert images (URLs were uploaded from client and passed as JSON)
		const imagesJson = formData.get('images_json') as string;
		if (imagesJson) {
			try {
				const imageRecords = JSON.parse(imagesJson) as {
					url: string;
					isPrimary: boolean;
					displayOrder: number;
				}[];

				if (imageRecords.length > 0) {
					const { error: imgError } = await locals.supabase
						.from('listing_images')
						.insert(
							imageRecords.map((img) => ({
								listing_id: listing.id,
								image_url: img.url,
								is_primary: img.isPrimary,
								display_order: img.displayOrder
							}))
						);
					if (imgError) console.error('Image insert error:', imgError.message);
				}
			} catch (e) {
				console.error('Failed to parse images JSON:', e);
			}
		}

		// Insert tags safely
		if (tagsRaw) {
			const tags = tagsRaw
				.split(',')
				.map((t) => t.trim().toLowerCase())
				.filter(Boolean)
				.slice(0, 10);

			for (const tagName of tags) {
				try {
					let { data: existingTag } = await locals.supabase
						.from('tags')
						.select('id')
						.eq('name', tagName)
						.maybeSingle();

					let tagId = existingTag?.id;
					if (!tagId) {
						const slugTag = tagName.replace(/[^a-z0-9]+/g, '-');
						const { data: newTag } = await locals.supabase
							.from('tags')
							.insert({ name: tagName, slug: slugTag })
							.select('id')
							.maybeSingle();
						tagId = newTag?.id;
					}
					if (tagId) {
						await locals.supabase
							.from('listing_tags')
							.insert({ listing_id: listing.id, tag_id: tagId });
					}
				} catch (tagErr) {
					console.error('Tag processing error:', tagErr);
				}
			}
		}

		// Redirect to dedicated canonical product page
		redirect(303, `/product/${listing.slug}`);
	}
};

function generateSlug(title: string): string {
	const base = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 50);
	const suffix = Math.random().toString(36).substring(2, 8);
	return `${base}-${suffix}`;
}
