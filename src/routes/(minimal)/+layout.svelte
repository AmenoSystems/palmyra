<script lang="ts">
	import { Moon, Sun } from 'lucide-svelte';
	import { supabase } from '$lib/supabaseClient';
	import { invalidateAll } from '$app/navigation';

	let { children, data } = $props();
	let isDark = $state(false);

	// Refresh server data when the logged-in user changes
	$effect(() => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, session) => {
			if (event === 'INITIAL_SESSION') return;
			if ((session?.user?.id ?? null) !== (data.user?.id ?? null)) invalidateAll();
		});
		return () => subscription.unsubscribe();
	});

	function applyTheme(dark: boolean) {
		isDark = dark;
		document.documentElement.classList.toggle('dark', dark);
		localStorage.setItem('theme', dark ? 'dark' : 'light');
	}

	function toggleTheme() {
		applyTheme(!isDark);
	}

	$effect(() => {
		const stored = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		applyTheme(stored ? stored === 'dark' : prefersDark);
	});
</script>

<style>
	@font-face {
		font-family: 'Umbratha';
		src: url('/fonts/umbratha.ttf') format('truetype');
		font-weight: 400;
		font-style: normal;
		font-display: swap;
	}
	@keyframes blob {
		0%   { transform: translate(0px, 0px) scale(1); }
		33%  { transform: translate(30px, -50px) scale(1.1); }
		66%  { transform: translate(-20px, 20px) scale(0.9); }
		100% { transform: translate(0px, 0px) scale(1); }
	}

	.font-umbratha {
		font-family: 'Umbratha', sans-serif;
	}

	.animate-blob {
		animation: blob 7s infinite;
	}

	.animation-delay-2000 {
		animation-delay: 2s;
	}

	.animation-delay-3000 {
		animation-delay: 3s;
	}
</style>

<div class="min-h-screen relative overflow-hidden bg-stone-500/50 dark:bg-[#202020]/90">
	<!-- Navbar -->
	<nav class="bg-transparent">
		<!-- Navbar Margins and Paddings-->
		<div class="mx-2 md:mx-10 px-4 py-2 sm:px-6 lg:px-8">
			<!-- Navbar Content-->
			<div class="flex justify-between items-center h-12">
				<!-- Logo-->
				<div class="flex items-center">
					<a href="/" class="text-5xl text-stone-800 dark:text-stone-100 font-umbratha">PALMYRA</a>
				</div>

				<!-- Right-Hand Side Icons -->
				<div class="flex items-center gap-2">
					<!-- Theme Toggle Button -->
					<button
						onclick={toggleTheme}
						class="p-2 rounded-full bg-transparent hover:bg-stone-400/30 transition-colors text-stone-800 dark:text-gray-300 min-h-11 min-w-11 flex items-center justify-center"
						aria-label="Toggle dark mode"
					>
						{#if isDark}
							<Sun class="w-5 h-5" />
						{:else}
							<Moon class="w-5 h-5" />
						{/if}
					</button>
				</div>
			</div>
		</div>
	</nav>

	<!-- Background With Colors -->
	<div class="absolute inset-0 -z-10">
		<div class="absolute top-0 right-200 w-130 h-130 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob"></div>
		<div class="absolute top-0 right-40 w-120 h-120 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
		<div class="absolute bottom-0 right-140 w-150 h-150 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-3000"></div>
	</div>

	<!-- Frosted Glass-->
	<main class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{@render children()}
	</main>
	<footer class="text-center text-stone-800/70 dark:text-gray-500 text-sm py-4">
		&copy; 2026 PALMYRA. All rights reserved.
	</footer>
</div>
