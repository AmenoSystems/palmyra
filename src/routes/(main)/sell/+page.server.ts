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
		console.log('user:', user?.id);
		if (!user) return fail(401, { message: 'Please sign in.' });

		const f = await request.formData();
		console.log('FORM FIELDS:', Object.fromEntries(
			[...f.entries()].map(([k, v]) => [k, k === 'images_json' ? `[${String(v).length} chars]` : v])
		));
		
		const str = (k: string) => String(f.get(k) ?? '').trim();
		const num = (k: string) => (str(k) === '' ? null : Number(str(k)));

		const title = str('title');
		const description = str('description');
		const condition = str('condition');
		const subcategoryId = str('subcategory_id');
		const startingPrice = num('starting_price');
		const buyNow = num('buy_it_now_price');
		const reserve = num('reserve_price');
		const quantity = Number(str('quantity') || 1);
		const start = new Date(str('start_iso'));
		const end = new Date(str('end_iso'));

		if (title.length < 3 || title.length > 120) return fail(400, { message: 'Title must be 3–120 characters.' });
		if (description.length < 10 || description.length > 2000) return fail(400, { message: 'Description must be 10–2000 characters.' });
		if (!CONDITIONS.includes(condition)) return fail(400, { message: 'Choose a condition.' });
		if (!UUID.test(subcategoryId)) return fail(400, { message: 'Choose a category and subcategory.' });

		const okPrice = (n: number | null) => n === null || (Number.isFinite(n) && n > 0 && n < 99_999_999);
		if (startingPrice === null || !okPrice(startingPrice)) return fail(400, { message: 'Enter a valid starting price.' });
		if (!okPrice(buyNow) || !okPrice(reserve)) return fail(400, { message: 'Invalid Buy It Now or reserve price.' });
		if (buyNow !== null && buyNow <= startingPrice) return fail(400, { message: 'Buy It Now must exceed the starting price.' });
		if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return fail(400, { message: 'Invalid quantity.' });

		if (isNaN(start.getTime()) || isNaN(end.getTime())) return fail(400, { message: 'Invalid dates.' });
		if (end <= start) return fail(400, { message: 'End date must be after the start date.' });
		if (end <= new Date()) return fail(400, { message: 'End date must be in the future.' });

		let images: { url: string; isPrimary: boolean }[] = [];
		try { images = JSON.parse(str('images_json')); } catch { /* handled below */ }
		if (
			!Array.isArray(images) || images.length < 1 || images.length > 8 ||
			!images.every((i) => typeof i.url === 'string' && i.url.startsWith(PUBLIC_SUPABASE_URL))
		) return fail(400, { message: 'Add 1–8 photos.' });

		// Category/subcategory names double as tags; this also validates the subcategory exists
		const { data: sub } = await locals.supabase
			.from('subcategories')
			.select('id, name, slug, categories(name, slug)')
			.eq('id', subcategoryId)
			.maybeSingle();
		if (!sub) return fail(400, { message: 'That subcategory does not exist.' });

		// 1. Draft
		const { data: listing, error: e1 } = await locals.supabase
			.from('listings')
			.insert({
				seller_id: user.id, subcategory_id: subcategoryId, title, slug: slugify(title),
				description, condition, starting_price: startingPrice, current_price: startingPrice,
				buy_it_now_price: buyNow, reserve_price: reserve, quantity, status: 'draft',
				start_date: start.toISOString(), end_date: end.toISOString()
			})
			.select('id, slug')
			.single();
		if (e1 || !listing) {
			console.error('listing insert:', e1);
			return fail(500, { message: 'Could not create the listing.' });
		}

		// 2. Images (roll back on failure)
		const primaryIdx = Math.max(0, images.findIndex((i) => i.isPrimary));
		const { error: e2 } = await locals.supabase.from('listing_images').insert(
			images.map((img, idx) => ({
				listing_id: listing.id, image_url: img.url, is_primary: idx === primaryIdx, display_order: idx
			}))
		);
		if (e2) {
			console.error('images:', e2);
			await locals.supabase.from('listings').delete().eq('id', listing.id);
			return fail(500, { message: 'Could not save the photos.' });
		}

		// 3. Tags (non-fatal)
		const cat = Array.isArray(sub.categories) ? sub.categories[0] : sub.categories;
		const userTags = str('tags').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
		const tags = [...new Set([cat?.name, sub.name, ...userTags].filter(Boolean).map((t) => String(t).toLowerCase()))].slice(0, 15);
		const { error: e3 } = await locals.supabase.rpc('set_listing_tags', {
			p_listing_id: listing.id, p_tags: tags
		});
		if (e3) console.error('tags:', e3);

		// 4. Publish
		const { error: e4 } = await locals.supabase.from('listings').update({ status: 'active' }).eq('id', listing.id);
		if (e4) {
			console.error('publish:', e4);
			return fail(500, { message: 'Saved as a draft but could not publish.' });
		}

		redirect(303, `/listings/${listing.slug}`);
	}
};