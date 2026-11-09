import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	return {
		user: user ? { id: user.id, email: user.email ?? null } : null
	};
};
