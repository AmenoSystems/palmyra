// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { SupabaseClient, User } from '@supabase/supabase-js';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
	  getUser: () => Promise<User | null>;
    }
  }
}
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
