import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, locals }) => {
  const code = url.searchParams.get('code');
  let next = url.searchParams.get('next') ?? '/';

  // Only allow relative redirects within your site
  if (!next.startsWith('/') || next.startsWith('//')) next = '/';

  if (code) {
    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(303, next);
    console.error('Auth callback error:', error.message);
  }

  redirect(303, '/?auth_error=1');
};