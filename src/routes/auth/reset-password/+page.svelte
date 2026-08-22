<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';

	let newPassword = $state('');
	let confirmPassword = $state('');
	let isLoading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	async function handleResetPassword(e: Event) {
		e.preventDefault();
		
		if (newPassword !== confirmPassword) {
			errorMessage = 'Passwords do not match';
			return;
		}

		if (newPassword.length < 8) {
			errorMessage = 'Password must be at least 8 characters';
			return;
		}

		isLoading = true;
		errorMessage = '';
		successMessage = '';

		try {
			const { error } = await supabase.auth.updateUser({
				password: newPassword
			});

			if (error) throw error;

			successMessage = 'Password updated successfully!';
			setTimeout(() => goto('/'), 2000);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center p-4">
	<div class="w-full max-w-md bg-white dark:bg-stone-800 rounded-2xl shadow-2xl p-6 sm:p-8">
		<h2 class="text-2xl font-semibold text-stone-800 dark:text-stone-100 text-center mb-2">
			Reset Password
		</h2>
		<p class="text-sm text-stone-500 dark:text-stone-400 text-center mb-6">
			Enter your new password below
		</p>

		{#if errorMessage}
			<div class="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400 text-sm">
				{errorMessage}
			</div>
		{/if}

		{#if successMessage}
			<div class="mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 text-green-600 dark:text-green-400 text-sm">
				{successMessage}
			</div>
		{/if}

		<form onsubmit={handleResetPassword} class="space-y-4">
			<div>
				<label for="new-password" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">
					New Password
				</label>
				<input
					id="new-password"
					type="password"
					placeholder="Enter new password"
					required
					minlength="8"
					class="w-full px-4 py-2.5 rounded-xl bg-stone-100/70 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 dark:placeholder:text-stone-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-300/50 transition-all text-sm"
					bind:value={newPassword}
					disabled={isLoading}
				/>
			</div>

			<div>
				<label for="confirm-password" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">
					Confirm Password
				</label>
				<input
					id="confirm-password"
					type="password"
					placeholder="Confirm new password"
					required
					minlength="8"
					class="w-full px-4 py-2.5 rounded-xl bg-stone-100/70 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 dark:placeholder:text-stone-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-300/50 transition-all text-sm"
					bind:value={confirmPassword}
					disabled={isLoading}
				/>
			</div>

			<button
				type="submit"
				disabled={isLoading}
				class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
			>
				{#if isLoading}
					<span class="flex items-center justify-center gap-2">
						<span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
						Updating...
					</span>
				{:else}
					Update Password
				{/if}
			</button>
		</form>
	</div>
</div>