import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// Canonical product URL redirects to /product/[slug]
	redirect(301, `/product/${params.slug}`);
};
