import { supabase } from '$lib/supabaseClient';

export async function load() {
	const { data: products, error } = await supabase
		.from('products')
		.select('id, name, desc, reviewScore, price');

	if (error) {
		console.error('Error loading products:', error.message);
		return { products: [] };
	}

	return { products: products ?? [] };
}

