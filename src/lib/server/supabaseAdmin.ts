import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';

/**
 * Server-only Supabase client with admin / service-role privileges.
 * When SUPABASE_SERVICE_ROLE_KEY is configured in .env.local, this client
 * bypasses Row-Level Security (RLS) for server actions such as placing bids,
 * recording orders, and updating listing current prices.
 */
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;

export const supabaseAdmin: SupabaseClient | null = serviceKey
	? createClient(PUBLIC_SUPABASE_URL, serviceKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false
			}
	  })
	: null;
