import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const user = await locals.getUser();
	const next = url.searchParams.get('next') ?? '/';

	// Sanitize: only allow relative URLs
	const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

	// Already signed in → go to destination
	if (user) redirect(303, safeNext);

	return { next: safeNext };
};
