<script lang="ts">
	import { X, Mail, Lock, Eye, EyeOff, Leaf } from 'lucide-svelte';

	let { open = false, onClose = () => {} } = $props();

	let activeTab = $state<'signin' | 'signup'>('signin');
	let showPassword = $state(false);
	let email = $state('');
	let password = $state('');
	let rememberMe = $state(false);

	function toggleTab(tab: 'signin' | 'signup') {
		activeTab = tab;
	}

	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		console.log(`[${activeTab}]`, { email, password, rememberMe });
		// onClose(); // uncomment on success
	}

	function handleGoogleSignIn() {
		console.log('Sign in with Google');
	}

</script>

{#if open}
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
	onkeydown={(e) => e.key === 'Escape' && onClose()}
	role="dialog"
	aria-modal="true"
>
	<div
		class="relative w-full max-w-md mx-4 bg-white dark:bg-stone-800 rounded-2xl shadow-2xl p-6 sm:p-8"
	>
		<!-- Close button -->
		<button
			class="absolute top-4 right-4 p-1.5 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition-colors text-stone-600 dark:text-stone-400 cursor-pointer"
			aria-label="Close"
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

		<!-- Tab Toggle -->
		<div class="flex bg-stone-200/50 dark:bg-stone-700/40 rounded-full p-1 mb-6">
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
			<div>
				<label class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">Email</label>
				<div class="relative">
					<div class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">
						<Mail class="w-4 h-4" />
					</div>
					<input
						type="email"
						placeholder="hello@palmyra.com"
						required
						class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-100/70 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 dark:placeholder:text-stone-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-300/50 transition-all text-sm"
						bind:value={email}
					/>
				</div>
			</div>

			<div>
				<label class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">Password</label>
				<div class="relative">
					<div class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">
						<Lock class="w-4 h-4" />
					</div>
					<input
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
					onclick={() => alert('Forgot password flow')}
				>
					Forgot password?
				</button>
			</div>

			<button
				type="submit"
				class="w-full py-3 rounded-xl bg-linear-to-r from-indigo-500 via-amber-400 to-rose-500 text-white dark:text-stone-900 font-semibold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
			>
				{activeTab === 'signin' ? 'Sign In' : 'Sign Up'}
			</button>
		</form>

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