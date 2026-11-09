import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) return { user: null, profile: null, avatarUrl: null, cartCount: 0 };

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('username, full_name, avatar_id')
		.eq('id', user.id)
		.maybeSingle();

	const username = profile?.username ?? user.email?.split('@')[0] ?? 'user';

	const avatarUrl = profile?.avatar_id
		? locals.supabase.storage.from('profile_pictures').getPublicUrl(profile.avatar_id).data.publicUrl
		: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&size=128`;

	// Fetch cart count for navbar badge
	let cartCount = 0;
	try {
		const { count, error } = await locals.supabase
			.from('cart_items')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', user.id);
		if (!error && count != null) cartCount = count;
	} catch {
		// table may not exist yet if migration pending
	}

	return {
		user: { id: user.id, email: user.email ?? null },
		profile: { username, full_name: profile?.full_name ?? null },
		avatarUrl,
		cartCount
	};
};
