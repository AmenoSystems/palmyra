import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { ...options, path: '/' });
          });
        }
      }
    }
  );

  // Always validates the session with Supabase (don't trust getSession() alone on the server)
  event.locals.getUser = async () => {
    const {
      data: { user },
      error
    } = await event.locals.supabase.auth.getUser();
    return error ? null : user;
  };

  const user = await event.locals.getUser();
  if (user) {
    const key = 'last_seen_ping';
    if (!event.cookies.get(key)) {
      await event.locals.supabase
        .from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id);
      event.cookies.set(key, '1', { path: '/', maxAge: 300 }); // at most once per 5 min
    }
  }

  return resolve(event, {
    filterSerializedResponseHeaders: (name) =>
      name === 'content-range' || name === 'x-supabase-api-version'
  });
};