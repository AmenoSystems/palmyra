import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const username = params.username.toLowerCase();
  const sb = locals.supabase;

  const avatar = (id: string | null) =>
    sb.storage.from('profile_pictures').getPublicUrl(id ?? 'default-user.png').data.publicUrl;

  const { data: profile, error: dbError } = await sb
    .from('profiles')
    .select('id, username, full_name, avatar_id, bio, rating, total_reviews, created_at')
    .ilike('username', username)
    .maybeSingle();

  if (dbError) {
    console.error(dbError);
    error(500, 'Failed to load profile');
  }
  if (!profile) error(404, 'User not found');

  const user = await locals.getUser();

  const [listingsRes, followersRes, followingRes, activityRes, postsRes, isFollowingRes] =
    await Promise.all([
      sb.from('listings')
        .select('id, title, slug, starting_price, current_price, listing_images(image_url, is_primary)')
        .eq('seller_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      sb.from('follows')
        .select('p:profiles!follows_follower_id_fkey(username, avatar_id)', { count: 'exact' })
        .eq('following_id', profile.id)
        .limit(6),
      sb.from('follows')
        .select('p:profiles!follows_following_id_fkey(username, avatar_id)', { count: 'exact' })
        .eq('follower_id', profile.id)
        .limit(6),
      sb.from('profile_activity')
        .select('type, ref_id, summary, occurred_at')
        .eq('user_id', profile.id)
        .order('occurred_at', { ascending: false })
        .limit(20),
      sb.from('profile_posts')
        .select('id, body, created_at, author:profiles!profile_posts_author_id_fkey(username, avatar_id)')
        .eq('profile_id', profile.id)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(20),
      user
        ? sb.from('follows').select('follower_id')
            .eq('follower_id', user.id).eq('following_id', profile.id).maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ]);

  // Don't crash the page if a table/view doesn't exist yet, just log it
  for (const r of [listingsRes, followersRes, followingRes, activityRes, postsRes]) {
    if (r.error) console.error(r.error);
  }

  const toPeople = (rows: any[] | null) =>
    (rows ?? [])
      .map((r) => r.p)
      .filter(Boolean)
      .map((p: any) => ({ username: p.username as string, avatar: avatar(p.avatar_id) }));

  return {
    profile,
    avatarUrl: avatar(profile.avatar_id),
    isOwnProfile: user?.id === profile.id,
    isLoggedIn: !!user,
    isFollowing: !!isFollowingRes.data,
    listings: listingsRes.data ?? [],
    followers: { count: followersRes.count ?? 0, items: toPeople(followersRes.data) },
    following: { count: followingRes.count ?? 0, items: toPeople(followingRes.data) },
    bio: profile.bio ?? '',
    activity: activityRes.data ?? [],
    posts: (postsRes.data ?? []).map((p: any) => ({
      id: p.id as string,
      body: p.body as string,
      created_at: p.created_at as string,
      author: p.author?.username ?? 'unknown',
      authorAvatar: avatar(p.author?.avatar_id ?? null)
    }))
  };
};

async function getTargetId(locals: App.Locals, username: string) {
  const { data } = await locals.supabase
    .from('profiles').select('id').ilike('username', username.toLowerCase()).maybeSingle();
  return data?.id as string | undefined;
}

export const actions: Actions = {
  follow: async ({ params, locals }) => {
    const user = await locals.getUser();
    if (!user) return fail(401, { message: 'Log in to follow users' });
    const targetId = await getTargetId(locals, params.username);
    if (!targetId || targetId === user.id) return fail(400, { message: 'Invalid user' });

    const { error: e } = await locals.supabase
      .from('follows').insert({ follower_id: user.id, following_id: targetId });
    if (e && e.code !== '23505') return fail(500, { message: 'Could not follow' }); // 23505 = already following
    return { success: true };
  },

  unfollow: async ({ params, locals }) => {
    const user = await locals.getUser();
    if (!user) return fail(401, { message: 'Log in first' });
    const targetId = await getTargetId(locals, params.username);
    if (!targetId) return fail(400, { message: 'Invalid user' });

    await locals.supabase
      .from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
    return { success: true };
  },

  post: async ({ params, locals, request }) => {
    const user = await locals.getUser();
    if (!user) return fail(401, { postError: 'Log in to post' });

    const body = String((await request.formData()).get('body') ?? '').trim();
    if (!body || body.length > 2000) return fail(400, { postError: 'Post must be 1-2000 characters' });

    const targetId = await getTargetId(locals, params.username);
    if (!targetId) return fail(400, { postError: 'Invalid user' });

    const { error: e } = await locals.supabase
      .from('profile_posts').insert({ profile_id: targetId, author_id: user.id, body });
    if (e) {
      console.error(e);
      return fail(500, { postError: 'Could not post' });
    }
    return { success: true };
  }
};