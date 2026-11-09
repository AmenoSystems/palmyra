<script lang="ts">
	import { Mail, Lock, Eye, EyeOff, Leaf, User as UserIcon, ArrowLeft } from 'lucide-svelte';
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';

	let { data } = $props();
	let next = $derived(data.next ?? '/');

	let activeTab = $state<'signin' | 'signup'>('signin');
	let showPassword = $state(false);
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let username = $state('');
	let isLoading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	function toggleTab(tab: 'signin' | 'signup') {
		activeTab = tab;
		errorMessage = '';
		successMessage = '';
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		errorMessage = '';
		successMessage = '';
		isLoading = true;

		try {
			if (activeTab === 'signin') {
				const { error } = await supabase.auth.signInWithPassword({
					email: email.trim(),
					password
				});
				if (error) throw error;
				successMessage = 'Welcome back!';
				setTimeout(() => goto(next), 800);
			} else {
				if (password !== confirmPassword) {
					errorMessage = 'Passwords do not match';
					return;
				}
				const { data: signUpData, error } = await supabase.auth.signUp({
					email: email.trim(),
					password,
					options: {
						emailRedirectTo: window.location.origin + '/auth/callback?next=' + encodeURIComponent(next),
						data: { username: username.trim() || email.split('@')[0] }
					}
				});
				if (error) throw error;
				if (signUpData.user?.identities?.length === 0) {
					errorMessage = 'An account with this email already exists.';
				} else {
					successMessage = 'Account created! Please check your email to verify.';
					setTimeout(() => {
						activeTab = 'signin';
						successMessage = 'Please sign in with your new account';
					}, 3000);
				}
			}
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			isLoading = false;
		}
	}

	async function handleGoogleSignIn() {
		errorMessage = '';
		isLoading = true;
		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: window.location.origin + '/auth/callback?next=' + encodeURIComponent(next),
					queryParams: { access_type: 'offline', prompt: 'consent' }
				}
			});
			if (error) throw error;
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google.';
			isLoading = false;
		}
	}

	async function handleForgotPassword() {
		if (!email) { errorMessage = 'Please enter your email first.'; return; }
		isLoading = true;
		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
				redirectTo: window.location.origin + '/auth/reset-password'
			});
			if (error) throw error;
			successMessage = 'Password reset email sent!';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to send reset email.';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{activeTab === 'signin' ? 'Sign In' : 'Sign Up'} | PALMYRA</title>
</svelte:head>

<!-- Full-page auth screen — mobile-first -->
<div class="min-h-full flex flex-col items-center justify-center px-4 py-12">
	<div class="w-full max-w-md bg-white/80 dark:bg-stone-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 dark:border-stone-700/40 p-6 sm:p-8">
		<!-- Logo -->
		<div class="flex flex-col items-center mb-6">
			<div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-2xl mb-1">
				<Leaf class="w-7 h-7" />
			</div>
			<h1 class="text-xl font-semibold text-stone-800 dark:text-stone-100 tracking-wider">PALMYRA</h1>
			<p class="text-xs text-stone-500 dark:text-stone-400 mt-1">Welcome to the marketplace</p>
			{#if next !== '/'}
				<p class="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-medium">Sign in to continue</p>
			{/if}
		</div>

		<!-- Tab switcher -->
		<div class="flex bg-stone-200/50 dark:bg-stone-700/40 rounded-full p-1 mb-6">
			<button
				class="flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-all duration-200 min-h-11"
				class:bg-indigo-600={activeTab === 'signin'}
				class:text-white={activeTab === 'signin'}
				class:shadow-sm={activeTab === 'signin'}
				class:text-stone-600={activeTab !== 'signin'}
				class:dark:text-stone-400={activeTab !== 'signin'}
				onclick={() => toggleTab('signin')}
			>Sign In</button>
			<button
				class="flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-all duration-200 min-h-11"
				class:bg-indigo-600={activeTab === 'signup'}
				class:text-white={activeTab === 'signup'}
				class:shadow-sm={activeTab === 'signup'}
				class:text-stone-600={activeTab !== 'signup'}
				class:dark:text-stone-400={activeTab !== 'signup'}
				onclick={() => toggleTab('signup')}
			>Sign Up</button>
		</div>

		<!-- Form -->
		<form class="space-y-4" onsubmit={handleSubmit}>
			{#if activeTab === 'signup'}
				<div>
					<label for="si-username" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">Username</label>
					<div class="relative">
						<div class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">
							<UserIcon class="w-4 h-4" />
						</div>
						<input
							id="si-username"
							type="text"
							placeholder="Your username"
							required
							class="w-full pl-10 pr-4 py-3 rounded-xl bg-stone-100/70 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm"
							bind:value={username}
						/>
					</div>
				</div>
			{/if}

			<div>
				<label for="si-email" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">Email</label>
				<div class="relative">
					<div class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">
						<Mail class="w-4 h-4" />
					</div>
					<input
						id="si-email"
						type="email"
						placeholder="hello@palmyra.com"
						required
						class="w-full pl-10 pr-4 py-3 rounded-xl bg-stone-100/70 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm"
						bind:value={email}
					/>
				</div>
			</div>

			<div>
				<label for="si-password" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">Password</label>
				<div class="relative">
					<div class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">
						<Lock class="w-4 h-4" />
					</div>
					<input
						id="si-password"
						type={showPassword ? 'text' : 'password'}
						placeholder="Min 8 characters"
						required
						minlength="8"
						class="w-full pl-10 pr-12 py-3 rounded-xl bg-stone-100/70 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm"
						bind:value={password}
					/>
					<button
						type="button"
						class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors p-1"
						onclick={() => showPassword = !showPassword}
						aria-label="Toggle password visibility"
					>
						{#if showPassword}<EyeOff class="w-4 h-4" />{:else}<Eye class="w-4 h-4" />{/if}
					</button>
				</div>
			</div>

			{#if activeTab === 'signup'}
				<div>
					<label for="si-confirm" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">Confirm Password</label>
					<div class="relative">
						<div class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">
							<Lock class="w-4 h-4" />
						</div>
						<input
							id="si-confirm"
							type={showPassword ? 'text' : 'password'}
							placeholder="Confirm your password"
							required
							minlength="8"
							class="w-full pl-10 pr-4 py-3 rounded-xl bg-stone-100/70 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm"
							bind:value={confirmPassword}
						/>
					</div>
				</div>
			{/if}

			{#if activeTab === 'signin'}
				<div class="flex items-center justify-end">
					<button
						type="button"
						class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline min-h-11 px-2"
						onclick={handleForgotPassword}
					>Forgot password?</button>
				</div>
			{/if}

			<button
				type="submit"
				disabled={isLoading}
				class="w-full py-3 rounded-xl bg-linear-to-r from-indigo-500 via-amber-400 to-rose-500 text-white font-semibold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed min-h-12"
			>
				{#if isLoading}
					<span class="flex items-center justify-center gap-2">
						<span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
						{activeTab === 'signin' ? 'Signing In…' : 'Signing Up…'}
					</span>
				{:else}
					{activeTab === 'signin' ? 'Sign In' : 'Sign Up'}
				{/if}
			</button>
		</form>

		{#if errorMessage}
			<div class="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
				<span class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
				{errorMessage}
			</div>
		{/if}

		{#if successMessage}
			<div class="mt-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
				<span class="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
				{successMessage}
			</div>
		{/if}

		<!-- OR -->
		<div class="flex items-center gap-3 my-5">
			<div class="flex-1 h-px bg-stone-300/40 dark:bg-stone-600/40"></div>
			<span class="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wide">or</span>
			<div class="flex-1 h-px bg-stone-300/40 dark:bg-stone-600/40"></div>
		</div>

		<!-- Google -->
		<button
			type="button"
			class="w-full py-3 rounded-xl bg-stone-100/70 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-700 dark:text-stone-300 font-medium text-sm flex items-center justify-center gap-2 hover:bg-stone-200/70 dark:hover:bg-stone-600/40 transition-all duration-200 min-h-12"
			onclick={handleGoogleSignIn}
			disabled={isLoading}
		>
			<!-- Google G icon -->
			<svg class="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
				<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
				<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
				<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
				<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
			</svg>
			Continue with Google
		</button>
	</div>

	<!-- Back link -->
	<div class="w-full max-w-md mt-6 align-baseline text-center">
		<a
			href="/"
			class="inline-flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
		>
			<ArrowLeft class="w-4 h-4" />
			Back to home
		</a>
	</div>
</div>
