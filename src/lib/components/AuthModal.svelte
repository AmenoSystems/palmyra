<script lang="ts">
	import type { User } from '@supabase/supabase-js';
	import { X, Mail, Lock, Eye, EyeOff, Leaf, User as UserIcon } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';

	let {
			open = false,
			onClose = () => {}
		}: { open?: boolean; onClose?: () => void } = $props();

	let activeTab = $state<'signin' | 'signup'>('signin');
	let showPassword = $state(false);
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let username = $state('');
	let rememberMe = $state(false);
	let isLoading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let modalRef = $state<HTMLDivElement | null>(null);

		
	onMount(() => {
		function handleClickOutside(e: MouseEvent) {
			if (modalRef && !modalRef.contains(e.target as Node)) {
				onClose();
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	});
		
	let user = $state<User | null>(null);

	$effect(() => {
		if (open) {
			// Get current session when modal opens
			supabase.auth.getSession().then(({ data: { session } }) => {
				user = session?.user ?? null;
				if (user) {
					successMessage = `Already signed in as ${user.email}`;
					setTimeout(() => onClose(), 1500);
				}
			});
		}
	});
	
	function toggleTab(tab: 'signin' | 'signup') {
		activeTab = tab;
	}

	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		errorMessage = '';
		successMessage = '';
		isLoading = true;

		try {
			if (activeTab === 'signin')
			{
				const { data, error } = await supabase.auth.signInWithPassword({
					email: email.trim(),
					password: password,
				});

				if (error) throw error;

				successMessage = 'Welcome back!';
				user = data.user;
				
				setTimeout(() => {
					onClose();
					goto('/');
				}, 1000);

			}
			else
			{
				if (password !== confirmPassword) {
					errorMessage = 'Passwords do not match';
					return;
				}
				const { data, error } = await supabase.auth.signUp({
					email: email.trim(),
					password: password,
					options: {
						emailRedirectTo: window.location.origin + '/auth/callback',
						data: {
							username: username.trim() || email.split('@')[0]
						}
					}
				});

				if (error) throw error;

				if (data.user?.identities?.length === 0)
				{
					errorMessage = 'An account with this email already exists. Please sign in instead.';
				}
				else
				{
					successMessage = 'Account created! Please check your email to verify your account.';
					setTimeout(() => {
						activeTab = 'signin';
						successMessage = 'Please sign in with your new account';
					}, 3000);
				}
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Something went wrong';
			console.error('Auth error:', error);
		} finally {
			isLoading = false;
		}
	}

	async function handleGoogleSignIn() {
		errorMessage = '';
		successMessage = '';
		isLoading = true;

		try {
			const { data, error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: window.location.origin + '/auth/callback',
					queryParams: {
						access_type: 'offline',
						prompt: 'consent',
					},
				},
			});

			if (error) throw error;
			
			onClose();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google.';
			console.error('Google auth error:', error);
			isLoading = false;
		}
	}

	async function handleForgotPassword() {
		if (!email) {
			errorMessage = 'Please enter your email address first.';
			return;
		}

		isLoading = true;
		errorMessage = '';
		successMessage = '';

		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
				redirectTo: window.location.origin + '/auth/reset-password',
			});

			if (error) throw error;
			successMessage = 'Password reset email sent! Check your inbox.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to send reset email.';
		} finally {
			isLoading = false;
		}
	}

</script>

{#if open}
<div
  class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
  onkeydown={(e) => e.key === 'Escape' && onClose()}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div
    class="relative w-full max-w-md bg-white dark:bg-stone-800 rounded-2xl  shadow-2xl p-6 sm:p-8 
           max-h-[95vh] overflow-y-auto"
    bind:this={modalRef}
  >
		<button
			class="absolute top-4 right-4 p-1.5 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition-colors text-stone-600 dark:text-stone-400 cursor-pointer"
			aria-label="Close"
			onclick={onClose}
		>
			<X class="w-5 h-5" />
		</button>

		<!-- Logo -->
		<div class="flex flex-col items-center mb-6">
			<div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-2xl mb-1">
				<Leaf class="w-7 h-7" />
			</div>
			<h2 class="text-xl font-semibold text-stone-800 dark:text-stone-100 tracking-wider">
				PALMYRA
			</h2>
			<p class="text-xs text-stone-500 dark:text-stone-400 mt-1">
				Welcome to the marketplace
			</p>
		</div>

		<div class="flex bg-stone-200/50 dark:bg-stone-700/40 rounded-full p-1 mb-6 transition">
			<button
				class="flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer"
				class:bg-indigo-600={activeTab === 'signin'}
				class:text-white={activeTab === 'signin'}
				class:shadow-sm={activeTab === 'signin'}
				class:text-stone-600={activeTab !== 'signin'}
				class:dark:text-stone-400={activeTab !== 'signin'}
				class:hover:text-stone-800={activeTab !== 'signin'}
				class:dark:hover:text-stone-200={activeTab !== 'signin'}
				onclick={() => toggleTab('signin')}
			>
				Sign In
			</button>
			<button
				class="flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer"
				class:bg-indigo-600={activeTab === 'signup'}
				class:text-white={activeTab === 'signup'}
				class:shadow-sm={activeTab === 'signup'}
				class:text-stone-600={activeTab !== 'signup'}
				class:dark:text-stone-400={activeTab !== 'signup'}
				class:hover:text-stone-800={activeTab !== 'signup'}
				class:dark:hover:text-stone-200={activeTab !== 'signup'}
				onclick={() => toggleTab('signup')}
			>
				Sign Up
			</button>
		</div>

		<!-- Form -->
		<form class="space-y-4" onsubmit={handleSubmit}>
			{#if activeTab === 'signup'}
				<div>
					<label for="auth-username" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">Username</label>
					<div class="relative">
						<div class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">
							<UserIcon class="w-4 h-4" />
						</div>
						<input
							id="auth-username"
							type="text"
							placeholder="Enter your username"
							required
							class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-100/70 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 dark:placeholder:text-stone-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-300/50 transition-all text-sm"
							bind:value={username}
						/>
					</div>
				</div>
			{/if}
			
			<div>
				<label for="auth-email" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">Email</label>
				<div class="relative">
					<div class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">
						<Mail class="w-4 h-4" />
					</div>
					<input
						id="auth-email"
						type="email"
						placeholder="hello@palmyra.com"
						required
						class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-100/70 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 dark:placeholder:text-stone-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-300/50 transition-all text-sm"
						bind:value={email}
					/>
				</div>
			</div>

			<div>
				<label for="auth-password" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">Password</label>
				<div class="relative">
					<div class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">
						<Lock class="w-4 h-4" />
					</div>
					<input
						id="auth-password"
						type={showPassword ? 'text' : 'password'}
						placeholder="Min 8 characters"
						required
						minlength="8"
						class="w-full pl-10 pr-12 py-2.5 rounded-xl bg-stone-100/70 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 dark:placeholder:text-stone-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-300/50 transition-all text-sm"
						bind:value={password}
					/>
					<button
						type="button"
						class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors cursor-pointer"
						onclick={togglePasswordVisibility}
						aria-label="Toggle password visibility"
					>
						{#if showPassword}
							<EyeOff class="w-4 h-4" />
						{:else}
							<Eye class="w-4 h-4" />
						{/if}
					</button>
				</div>
			</div>

			<!-- Confirm Password -->
			{#if activeTab === 'signup'}
				<div>
					<label for="auth-confirm-password" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">Confirm Password</label>
					<div class="relative">
						<div class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">
							<Lock class="w-4 h-4" />
						</div>
						<input
							id="auth-confirm-password"
							type={showPassword ? 'text' : 'password'}
							placeholder="Confirm your password"
							required
							minlength="8"
							class="w-full pl-10 pr-12 py-2.5 rounded-xl bg-stone-100/70 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 dark:placeholder:text-stone-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-300/50 transition-all text-sm"
							bind:value={confirmPassword}
						/>
					</div>
				</div>
			{/if}

			{#if activeTab === 'signin'}
				<div class="flex items-center justify-between">
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							class="w-4 h-4 rounded border-stone-300 accent-indigo-600 cursor-pointer"
							bind:checked={rememberMe}
						/>
						<span class="text-xs text-stone-600 dark:text-stone-400">Remember me</span>
					</label>
					<button
						type="button"
						class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
						onclick={handleForgotPassword}
					>
						Forgot password?
					</button>
				</div>
			{/if}
			<button
				type="submit"
				disabled={isLoading}
				class={`
					w-full py-3 rounded-xl 
					bg-linear-to-r from-indigo-500 via-amber-400 to-rose-500 
					text-white dark:text-stone-900 font-semibold text-sm 
					shadow-lg hover:shadow-xl hover:-translate-y-0.5 
					active:translate-y-0 transition-all duration-200 
					disabled:opacity-60 disabled:cursor-not-allowed 
					disabled:hover:translate-y-0 disabled:hover:shadow-lg
					cursor-pointer whitespace-nowrap
				`}
			>
				{#if isLoading}
					<span class="flex items-center justify-center gap-2">
						<span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
						{activeTab === 'signin' ? 'Signing In...' : 'Signing Up...'}
					</span>
				{:else}
					{activeTab === 'signin' ? 'Sign In' : 'Sign Up'}
				{/if}
			</button>
		</form>

		{#if errorMessage}
			<div class="mt-2 mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
				<span class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
				<span>{errorMessage}</span>
			</div>
		{/if}

		{#if successMessage}
			<div class="mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
				<span class="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
				{successMessage}
			</div>
		{/if}

		<!-- OR divider -->
		<div class="flex items-center gap-3 my-5">
			<div class="flex-1 h-px bg-stone-300/40 dark:bg-stone-600/40"></div>
			<span class="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wide">or</span>
			<div class="flex-1 h-px bg-stone-300/40 dark:bg-stone-600/40"></div>
		</div>

		<!-- Google -->
		<button
			type="button"
			class="w-full py-2.5 rounded-xl bg-stone-100/70 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-700 dark:text-stone-300 font-medium text-sm flex items-center justify-center gap-2 hover:bg-stone-200/70 dark:hover:bg-stone-600/40 transition-all duration-200 cursor-pointer"
			onclick={handleGoogleSignIn}
		>
			<span class="w-5 h-5 flex items-center justify-center">
			</span>
			Continue with Google
		</button>
	</div>
</div>
{/if}