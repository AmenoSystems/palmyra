<script lang="ts">
	import SearchBar from '$lib/components/SearchBar.svelte';
	import CategoryBar from '$lib/components/CategoryBar.svelte';
	import HamburgerMenu from '$lib/components/HamburgerMenu.svelte';
	import FabButton from '$lib/components/FloatingActionBar.svelte';
	import {
		Moon,
		Sun,
		ShoppingCart,
		LogOut,
		CircleUser,
		MapPin,
		User,
		Package,
		ShoppingBag,
		PlusCircle,
		Store
	} from 'lucide-svelte';
	import Authmodal from '$lib/components/AuthModal.svelte';
	import ProductListingModal from '$lib/components/ProductListingModal.svelte';
	import { supabase } from '$lib/supabaseClient';
	import { goto, invalidateAll } from '$app/navigation';
	import { getLocalCart } from '$lib/cart';

	let { children, data } = $props();

	let user = $derived(data.user);
	let profile = $derived(data.profile);
	let avatarUrl = $derived(data.avatarUrl);

	let isDark = $state(false);
	let mobileMenuOpen = $state(false);
	let activeCategory = $state('recentlylisted');
	let showAuthModal = $state(false);
	let showListingModal = $state(false);
	let showDropdown = $state(false);

	// Cart count state (synced with both server and client localStorage)
	let cartCount = $state(0);

	$effect(() => {
		const localItems = getLocalCart();
		if (localItems.length > 0) {
			cartCount = localItems.length;
		} else if (data.cartCount != null) {
			cartCount = data.cartCount;
		}

		const handleCartUpdate = (e: any) => {
			if (e.detail?.count != null) {
				cartCount = e.detail.count;
			}
		};

		window.addEventListener('cart-updated', handleCartUpdate);
		const handleOpenAuth = () => {
			showAuthModal = true;
		};
		window.addEventListener('open-auth-modal', handleOpenAuth);
		return () => {
			window.removeEventListener('cart-updated', handleCartUpdate);
			window.removeEventListener('open-auth-modal', handleOpenAuth);
		};
	});

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

	async function signOut() {
		await supabase.auth.signOut();
		showDropdown = false;
		await invalidateAll();
		goto('/');
	}

	function applyTheme(dark: boolean) {
		isDark = dark;
		document.documentElement.classList.toggle('dark', dark);
		localStorage.setItem('theme', dark ? 'dark' : 'light');
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function openAuthModal() {
		showAuthModal = true;
	}
	function closeAuthModal() {
		showAuthModal = false;
	}

	function toggleTheme() {
		applyTheme(!isDark);
	}

	/** "Start Selling" — route based on auth state */
	function handleStartSelling() {
		if (user) {
			showListingModal = true;
		} else {
			openAuthModal();
		}
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
		0% {
			transform: translate(0px, 0px) scale(1);
		}
		33% {
			transform: translate(30px, -50px) scale(1.1);
		}
		66% {
			transform: translate(-20px, 20px) scale(0.9);
		}
		100% {
			transform: translate(0px, 0px) scale(1);
		}
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
		<div class="mx-2 md:mx-10 px-4 py-2 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center h-12">
				<!-- Hamburger Menu (visible only on mobile/tablet) -->
				<div class="md:hidden text-stone-800 dark:text-stone-200">
					<HamburgerMenu bind:open={mobileMenuOpen} />
				</div>

				<!-- Logo-->
				<div class="flex items-center">
					<a href="/" class="text-5xl text-stone-800 dark:text-stone-100 font-umbratha tracking-wider">PALMYRA</a>
				</div>

				<!-- Location -->
				<div class="flex items-center mt-1">
					<MapPin class="hidden lg:block text-stone-800 dark:text-stone-100 w-4 h-4" />
					<div class="hidden lg:block items-center justify-start w-auto">
						<button
							class="bg-transparent text-stone-600 dark:text-stone-300 text-xs px-3 py-1 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition-colors text-left"
						>
							Delivering to India
							<br />
							<span class="font-bold text-stone-800 dark:text-stone-100">Marketplace</span>
						</button>
					</div>
				</div>

				<!-- Search Bar (hidden on mobile, visible on tablet+) -->
				<div class="hidden md:flex flex-1 justify-center max-w-2xl mx-4 py-0.5">
					<SearchBar />
				</div>

				<!-- Right-Hand Side Icons -->
				<div class="flex items-center gap-2">
					<!-- Theme Toggle Button -->
					<button
						onclick={toggleTheme}
						class="p-2 rounded-full bg-transparent hover:bg-stone-400/30 transition-colors text-stone-800 dark:text-gray-300 min-h-11 min-w-11 flex items-center justify-center cursor-pointer"
						aria-label="Toggle dark mode"
					>
						{#if isDark}
							<Sun class="w-5 h-5 text-amber-400" />
						{:else}
							<Moon class="w-5 h-5" />
						{/if}
					</button>

					<!-- Start Selling button (desktop) -->
					<button
						onclick={handleStartSelling}
						class="hidden md:flex items-center gap-1.5 py-2 px-4 rounded-full bg-stone-800 hover:bg-stone-900 dark:bg-stone-100 dark:hover:bg-stone-300 transition-colors text-stone-200 dark:text-stone-800 font-semibold text-xs min-h-11 shadow-sm cursor-pointer"
						aria-label="Sell a product"
					>
						<PlusCircle class="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
						Start Selling
					</button>

					<!-- Shopping Cart Button with Dynamic Badge -->
					<a
						href="/cart"
						class="relative p-2 rounded-full bg-stone-300/60 hover:bg-stone-400/30 dark:bg-stone-500/50 dark:hover:bg-stone-600/50 transition-colors text-stone-800 dark:text-gray-300 min-h-11 min-w-11 flex items-center justify-center cursor-pointer"
						aria-label="View shopping cart"
					>
						<ShoppingCart class="w-5 h-5" />
						{#if cartCount > 0}
							<span
								class="absolute -top-1 -right-1 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-md animate-scale"
							>
								{cartCount}
							</span>
						{/if}
					</a>

					<!-- User Profile Button / Dropdown -->
					{#if user}
						<!-- User is signed in -->
						<div class="relative">
							<button
								onclick={() => (showDropdown = !showDropdown)}
								class="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition-colors min-h-11 cursor-pointer"
								aria-label="User menu"
							>
								<img
									src={avatarUrl}
									alt="User Avatar"
									class="w-8 h-8 rounded-full object-cover border border-white/40 dark:border-stone-600"
								/>
								<span
									class="text-xs font-semibold text-stone-800 dark:text-stone-200 hidden sm:inline truncate max-w-[100px]"
								>
									{profile?.username || user.email?.split('@')[0]}
								</span>
							</button>

							<!-- User Dropdown Menu -->
							{#if showDropdown}
								<div
									class="absolute right-0 mt-2 w-56 bg-white dark:bg-stone-800 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden z-50 divide-y divide-stone-100 dark:divide-stone-700"
								>
									<div class="px-4 py-3">
										<p class="text-xs text-stone-400">Signed in as</p>
										<p class="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">
											{user.email}
										</p>
									</div>

									<div class="py-1">
										<a
											href={`/u/${profile?.username || user.email?.split('@')[0]}`}
											class="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2.5 transition-colors"
											onclick={() => (showDropdown = false)}
										>
											<User class="w-4 h-4 text-indigo-500" />
											My Profile
										</a>

										<!-- SELLER DASHBOARD (Requested in Misc requirement) -->
										<a
											href="/dashboard/seller"
											class="w-full px-4 py-2 text-left text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5 transition-colors"
											onclick={() => (showDropdown = false)}
										>
											<Store class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
											Seller Dashboard
										</a>

										<!-- BUYER DASHBOARD -->
										<a
											href="/dashboard/buyer"
											class="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2.5 transition-colors"
											onclick={() => (showDropdown = false)}
										>
											<ShoppingBag class="w-4 h-4 text-indigo-500" />
											Buyer Dashboard
										</a>

										<!-- CART -->
										<a
											href="/cart"
											class="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center justify-between transition-colors"
											onclick={() => (showDropdown = false)}
										>
											<span class="flex items-center gap-2.5">
												<ShoppingCart class="w-4 h-4 text-indigo-500" />
												My Cart
											</span>
											{#if cartCount > 0}
												<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
													{cartCount}
												</span>
											{/if}
										</a>
									</div>

									<div class="py-1">
										<!-- Start Selling Modal Trigger -->
										<button
											onclick={() => {
												showDropdown = false;
												showListingModal = true;
											}}
											class="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2.5 transition-colors cursor-pointer"
										>
											<PlusCircle class="w-4 h-4 text-teal-600" />
											Publish Product
										</button>

										<button
											onclick={signOut}
											class="w-full px-4 py-2 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 transition-colors cursor-pointer"
										>
											<LogOut class="w-4 h-4" />
											Sign Out
										</button>
									</div>
								</div>
							{/if}
						</div>
					{:else}
						<button
							onclick={openAuthModal}
							class="p-2 rounded-full bg-stone-300/60 hover:bg-stone-400/30 dark:bg-stone-500/50 dark:hover:bg-stone-600/50 transition-colors text-stone-800 dark:text-gray-300 min-h-11 min-w-11 flex items-center justify-center cursor-pointer"
							aria-label="Sign in"
						>
							<CircleUser class="w-5 h-5" />
						</button>
					{/if}
				</div>
			</div>

			<!-- Mobile Search Bar & Quick Menu (visible when burger menu is open) -->
			<div
				class={`
					md:hidden transition-all duration-300 ease-in-out overflow-hidden
					${mobileMenuOpen ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'}
				`}
			>
				<SearchBar />

				<div class="mt-3 p-3 rounded-2xl bg-white/40 dark:bg-stone-800/40 backdrop-blur-md space-y-2 text-xs">
					<div class="grid grid-cols-2 gap-2">
						<a
							href="/listings"
							class="p-2.5 rounded-xl bg-stone-100/60 dark:bg-stone-700/50 font-semibold text-center text-stone-800 dark:text-stone-200"
							onclick={() => (mobileMenuOpen = false)}
						>
							Browse All
						</a>
						<a
							href="/cart"
							class="p-2.5 rounded-xl bg-stone-100/60 dark:bg-stone-700/50 font-semibold text-center text-stone-800 dark:text-stone-200 flex items-center justify-center gap-1.5"
							onclick={() => (mobileMenuOpen = false)}
						>
							<ShoppingCart class="w-3.5 h-3.5" /> Cart ({cartCount})
						</a>
						<a
							href="/dashboard/seller"
							class="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 font-semibold text-center text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5"
							onclick={() => (mobileMenuOpen = false)}
						>
							<Store class="w-3.5 h-3.5" /> Seller Hub
						</a>
						<a
							href="/dashboard/buyer"
							class="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 font-semibold text-center text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-1.5"
							onclick={() => (mobileMenuOpen = false)}
						>
							<ShoppingBag class="w-3.5 h-3.5" /> Buyer Hub
						</a>
					</div>
				</div>
			</div>
		</div>
	</nav>

	<!-- Category Bar -->
	<div class="mx-2 md:mx-10 px-4 sm:px-6 lg:px-8">
		<CategoryBar bind:activeCategory bind:mobileOpen={mobileMenuOpen} />
	</div>

	<!-- Background Animated Colors -->
	<div class="absolute inset-0 -z-10 pointer-events-none">
		<div
			class="absolute top-0 right-200 w-130 h-130 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob"
		></div>
		<div
			class="absolute top-0 right-40 w-120 h-120 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"
		></div>
		<div
			class="absolute bottom-0 right-140 w-150 h-150 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-3000"
		></div>
	</div>

	<!-- Main Content Area -->
	<main class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
		{@render children()}
	</main>

	<footer class="text-center text-stone-700/70 dark:text-stone-400 text-xs py-6">
		&copy; 2026 PALMYRA — Unified Auction Marketplace & E-commerce Platform. All rights reserved.
	</footer>

	<!-- Floating Action Search / Menu Button for Mobile -->
	<div class="md:hidden">
		<FabButton onClick={toggleMobileMenu} open={mobileMenuOpen} />
	</div>

	<!-- Mobile "Start Selling" FAB -->
	<div class="md:hidden fixed bottom-20 right-4 z-40">
		<button
			onclick={handleStartSelling}
			class="flex items-center gap-2 px-4 py-3 rounded-full bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 shadow-2xl text-xs font-bold min-h-12 cursor-pointer"
			aria-label="Start Selling"
		>
			<PlusCircle class="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
			Start Selling
		</button>
	</div>

	<!-- Modals -->
	<Authmodal open={showAuthModal} onClose={closeAuthModal} />

	<ProductListingModal
		open={showListingModal}
		onClose={() => (showListingModal = false)}
		onPublished={() => invalidateAll()}
	/>
</div>
