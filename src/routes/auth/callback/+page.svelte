<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';

	onMount(async () => {
		try {
			// Handle the OAuth callback
			const { data, error } = await supabase.auth.getSession();
			
			if (error) throw error;
			
			if (data.session) {
				// Successfully authenticated
				await goto('/');
			} else {
				// No session - maybe an error
				await goto('/');
			}
		} catch (error) {
			console.error('Auth callback error:', error);
			await goto('/');
		}
	});
</script>

<div class="min-h-screen flex items-center justify-center">
	<div class="text-center">
		<div class="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
		<p class="mt-4 text-stone-600 dark:text-stone-400">Completing sign in...</p>
	</div>
</div>