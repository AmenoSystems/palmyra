<script lang="ts">
	import './layout.css';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import CategoryBar from '$lib/components/CategoryBar.svelte';
	import HamburgerMenu from '$lib/components/HamburgerMenu.svelte';
	import favicon from '$lib/assets/palm-tree.svg';
	import { Moon, Sun, ShoppingCart, User } from 'lucide-svelte';
	let { children } = $props();
	let isDark = $state(false);
	let menuOpen = $state(false);
	let activeCategory = $state('All');
	function applyTheme(dark: boolean) {
		isDark = dark;
		document.documentElement.classList.toggle('dark', dark);
		localStorage.setItem('theme', dark ? 'dark' : 'light');
	}
	function toggleTheme() {
		applyTheme(!isDark);}
	$effect(() => {
		const stored = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		applyTheme(stored ? stored === 'dark' : prefersDark);
	});
</script>
<svelte:head><link rel="icon" href={favicon} /></svelte:head>
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
  
	.animate-blob {
		animation: blob 7s infinite;
	}
  
	.animation-delay-2000 {
		animation-delay: 2s;
	}
  
	.animation-delay-3000 {
		animation-delay: 3s;
	}
	/* ── Nav wrapper ── */
	.nav-wrapper {
		position: sticky;
		top: 0;
		z-index: 50;
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		background: rgba(214, 205, 195, 0.45);
		border-bottom: 1px solid rgba(255, 255, 255, 0.22);
		transition: background 0.3s;
	}
	:global(.dark) .nav-wrapper {
		background: rgba(32, 32, 32, 0.65);
		border-bottom-color: rgba(255, 255, 255, 0.06);
	}
	/* ── Desktop row ── */
	.nav-desktop {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 24px;
	}
	.nav-logo {
		font-size: 2rem;
		line-height: 1;
		text-decoration: none;
		color: rgb(41 37 36);
		font-family: 'Umbratha', sans-serif;
		flex-shrink: 0;
		letter-spacing: 0.04em;
		white-space: nowrap;
	}
	:global(.dark) .nav-logo {
		color: rgb(231 222 212);
	}
	.nav-search {
		flex: 1;
		min-width: 0;
	}
	.nav-actions {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
	}
.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: none;
		background: rgba(180, 165, 148, 0.3);
		color: rgb(68 56 47);
		cursor: pointer;
		transition: background 0.2s, transform 0.15s;
	}
	.icon-btn:hover {
		background: rgba(180, 165, 148, 0.55);
		transform: scale(1.06);
	}
	:global(.dark) .icon-btn {
		background: rgba(100, 90, 80, 0.35);
		color: rgba(231, 222, 210, 0.9);
	}
	:global(.dark) .icon-btn:hover {
		background: rgba(120, 110, 98, 0.5);
	}
	/* ── Mobile row ── */
	.nav-mobile {
		display: none;
		flex-direction: column;
		padding: 8px 14px 4px;
		gap: 8px;
	}
	.nav-mobile-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.nav-mobile-left {
		display: flex;
		align-items: center;
		gap: 10px;
		color: rgb(68 56 47);
	}
	:global(.dark) .nav-mobile-left {
		color: rgba(231, 222, 210, 0.9);
	}
	.nav-mobile-logo {
		font-size: 1.5rem;
		text-decoration: none;
		color: rgb(41 37 36);
		font-family: 'Umbratha', sans-serif;
		letter-spacing: 0.04em;
		white-space: nowrap;
	}
	:global(.dark) .nav-mobile-logo {
		color: rgb(231 222 212);
	}
	.nav-mobile-right {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.nav-mobile-search {
		width: 100%;
	}
	/* ── Breakpoint switching ── */
	@media (max-width: 767px) {
		.nav-desktop {
			display: none;
		}
		.nav-mobile {
			display: flex;
		}
	}
	/* ── Category divider ── */
	.category-divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.18);
		margin: 0 16px;
	}
	:global(.dark) .category-divider {
		background: rgba(255, 255, 255, 0.06);
	}
</style>
<div class="min-h-screen relative overflow-hidden bg-stone-500/50 dark:bg-[#202020]/90">
	<!-- ─── Sticky Navigation ─── -->
	<div class="nav-wrapper">
		<!-- Desktop nav -->
		<div class="nav-desktop">
			<!-- Logo -->
			<a href="/" class="nav-logo">PALMYRA</a>
			<!-- Search bar -->
			<div class="nav-search">
				<SearchBar />
			</div>
			<!-- Action icons -->
			<div class="nav-actions">
				<!-- Theme toggle -->
				<button onclick={toggleTheme} class="icon-btn" aria-label="Toggle theme">
					{#if isDark}
						<Sun class="w-4 h-4" />
					{:else}
						<Moon class="w-4 h-4" />
					{/if}
				</button>
				<!-- User -->
				<button class="icon-btn" aria-label="User account">
					<User class="w-4 h-4" />
				</button>
				<!-- Cart -->
				<button class="icon-btn" aria-label="Shopping cart">
					<ShoppingCart class="w-4 h-4" />
				</button>
			</div>
		</div>
		<!-- Mobile nav -->
		<div class="nav-mobile">
			<div class="nav-mobile-top">
				<!-- Left: hamburger + logo -->
				<div class="nav-mobile-left">
					<HamburgerMenu bind:open={menuOpen} />
					<a href="/" class="nav-mobile-logo">PALMYRA</a>
				</div>
				<!-- Right: theme + user + cart -->
				<div class="nav-mobile-right">
					<button onclick={toggleTheme} class="icon-btn" aria-label="Toggle theme">
						{#if isDark}
							<Sun class="w-4 h-4" />
						{:else}
							<Moon class="w-4 h-4" />
						{/if}
					</button>
					<button class="icon-btn" aria-label="User account">
						<User class="w-4 h-4" />
					</button>
					<button class="icon-btn" aria-label="Shopping cart">
						<ShoppingCart class="w-4 h-4" />
					</button>
				</div>
			</div>
			<!-- Search below top row on mobile -->
			<div class="nav-mobile-search">
				<SearchBar />
			</div>
		</div>
		<!-- Category bar (desktop pill-row + mobile dropdown) -->
		<div class="category-divider"></div>
		<CategoryBar bind:activeCategory bind:mobileOpen={menuOpen} />
	</div>
	<!-- Background with soft blurred colors -->
	<div class="absolute inset-0 -z-10">
		<div class="absolute top-0 right-200 w-130 h-130 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob"></div>
		<div class="absolute top-0 right-40 w-120 h-120 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
		<div class="absolute bottom-0 right-140 w-150 h-150 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-3000"></div>
	</div>
  <!-- Frosted glass main content -->
	<main class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<div class="backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-6 md:p-8">
		{@render children()}
		</div>
	</main>
	<footer class="text-center text-stone-800/70 dark:text-gray-500 text-sm py-4">
		&copy; 2024 PALMYRA. All rights reserved.
	</footer>
</div>

				