import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const username = params.username.toLowerCase();

  const { data: profile, error: dbError } = await locals.supabase
    .from('profiles')
    .select('id, username, full_name, avatar_id, bio, rating, total_reviews, created_at')
    .eq('username', username)
    .maybeSingle();

  if (dbError) {
    console.error(dbError);
    error(500, 'Failed to load profile');
  }

  if (!profile) {
    console.error(dbError);
    error(404, 'User not found');
  }

  return { profile };
};