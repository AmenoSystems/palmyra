<script lang="ts">
	import './layout.css';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import CategoryBar from '$lib/components/CategoryBar.svelte';
	import HamburgerMenu from '$lib/components/HamburgerMenu.svelte';
	import FabButton from '$lib/components/FloatingActionBar.svelte';
	import favicon from '$lib/assets/palm-tree.svg';
	import { Moon, Sun, ShoppingCart, User, MapPin } from 'lucide-svelte';

	let { children } = $props();
	let isDark = $state(false);
	let mobileMenuOpen = $state(false);
	let activeCategory = $state('recentlylisted');

	function applyTheme(dark: boolean) {
		isDark = dark;
		document.documentElement.classList.toggle('dark', dark);
		localStorage.setItem('theme', dark ? 'dark' : 'light');
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function toggleTheme() {
		applyTheme(!isDark);}
	$effect(() => {
		const stored = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		applyTheme(stored ? stored === 'dark' : prefersDark);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

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
				<!-- Hamburger Menu (visible only on mobile/tablet) -->
				<div class="md:hidden">
					<HamburgerMenu bind:open={mobileMenuOpen} />
				</div>

				<!-- Logo-->
				<div class="flex items-center">
					<a href="/" class="text-5xl text-stone-800 dark:text-stone-100 font-umbratha">PALMYRA</a>
				</div>

				<!-- Location -->
				<div class="flex items-center mt-1">
					<MapPin />
					<div class="flex items-center justify-start w-full md:w-auto">
						<button class="bg-transparent text-stone-600 dark:text-stone-100 text-lg md:text-sm px-4 py-1 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition-colors text-left">
							Delivering to Guwahati, Assam
							<br>
							<span class="font-bold text-stone-800 dark:text-stone-300 text-base">Update Location</span>
						</button>
					</div>
				</div>
				

				<!-- Search Bar (hidden on mobile, visible on tablet+) -->
				<div class="hidden md:flex flex-1 justify-center max-w-3xl mx-4 py-0.5">
					<SearchBar />
				</div>

				<!-- Right-Hand Side Icons -->
				<div class="flex items-center gap-2">
					<!-- Theme Toggle Button -->
					<button
						onclick={toggleTheme}
						class="p-2 rounded-full md:bg-stone-300/60 hover:bg-stone-400/30 transition-colors text-stone-800 dark:text-gray-300"
						aria-label="Toggle dark mode"
					>
						{#if isDark}
						<Sun class="w-5 h-5" />
						{:else}
						<Moon class="w-5 h-5" />
						{/if}
					</button>

					<button class="hidden md:block py-2 px-4 rounded-full bg-stone-800 hover:bg-stone-900 transition-colors text-stone-200 dark:text-gray-300" aria-label="Sell an item">
						Start Selling
					</button>

					<!-- Shopping Cart Button -->
					<button class="hidden md:block p-2 rounded-full bg-stone-300/60 hover:bg-stone-400/30 transition-colors text-stone-800 dark:text-gray-300" aria-label="View cart">
						<ShoppingCart class="w-5 h-5" />
					</button>

					<!-- User Profile Button -->
					<button class="hidden md:block p-2 rounded-full bg-stone-300/60 hover:bg-stone-400/30 transition-colors text-stone-800 dark:text-gray-300" aria-label="View user profile">
						<User class="w-5 h-5" />
					</button>
				</div>
			</div>

			<!-- Mobile Search Bar (visible only when burger menu is open) -->
			<div 
				class={`
					md:hidden transition-all duration-300 ease-in-out overflow-hidden
					${mobileMenuOpen ? 'max-h-20 opacity-100 mt-2' : 'max-h-0 opacity-0'}
				`}
			>
				<SearchBar />
			</div>
		</div>
	</nav>

	<!-- Category Bar -->
	<div class="mx-10 px-4 sm:px-6 lg:px-8">
		<CategoryBar bind:activeCategory bind:mobileOpen={mobileMenuOpen} />
	</div>

	<!-- Background With Colors -->
	<div class="absolute inset-0 -z-10">
		<div class="absolute top-0 right-200 w-130 h-130 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob"></div>
		<div class="absolute top-0 right-40 w-120 h-120 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
		<div class="absolute bottom-0 right-140 w-150 h-150 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-3000"></div>
	</div>

	<!-- Frosted Glass-->
	<main class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<div class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-6 md:p-8">
			{@render children()}
		</div>
	</main>
	<footer class="text-center text-stone-800/70 dark:text-gray-500 text-sm py-4">
		&copy; 2026 PALMYRA. All rights reserved.
	</footer>

	<!-- Floating Action Search Button for Mobile -->
	<div class="md:hidden">
		<FabButton onClick={toggleMobileMenu} open={mobileMenuOpen} />
	</div>
</div>

				