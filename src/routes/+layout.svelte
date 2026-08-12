<script lang="ts">
	import './layout.css';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import favicon from '$lib/assets/palm-tree.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<style>
	@font-face {
		font-family: 'Umbratha';
		src: url('./fonts/umbratha.ttf') format('truetype');
		font-weight: 400;
		font-style: normal;
		font-display: swap;
	}

	.font-umbratha {
		font-family: 'Umbratha', sans-serif;
	}

	@keyframes blob {
		0% { transform: translate(0px, 0px) scale(1); }
		33% { transform: translate(30px, -50px) scale(1.1); }
		66% { transform: translate(-20px, 20px) scale(0.9); }
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
</style>



<div class="min-h-screen relative overflow-hidden bg-stone-500/50">
	<nav class="bg-transparent">
		<div class="mx-10 px-4 py-2 sm:px-6 lg:px-8">
			<div class="flex justify-between h-12">
				<div class="flex items-center">
					<a href="/" class="text-5xl text-stone-800 font-umbratha">PALMYRA</a>
				</div>

				<div class="flex-1 flex justify-center max-w-3xl mx-4 py-0.5">
					<SearchBar />
				</div>

				<div class="flex items-center space-x-4 bg-stone-300/50 rounded-full px-4 backdrop-blur-lg">
					<a href="/about" class="text-gray-800 hover:underline">About</a>
					<a href="/contact" class="text-gray-800 hover:underline">Contact</a>
				</div>
			</div>
		</div>
	</nav>
	<!-- Background with soft blurred colors -->
	<div class="absolute inset-0 -z-10">
		<div class="absolute top-0 right-200 w-130 h-130 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob"></div>
		<div class="absolute top-0 right-40 w-120 h-120 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
		<div class="absolute bottom-0 right-140 w-150 h-150 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-3000"></div>
	</div>

  <!-- Frosted glass main content -->
	<main class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<div class="backdrop-blur-lg bg-stone-200/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-6 md:p-8">
		{@render children()}
		</div>
	</main>

	<!-- Footer TODO: Put the footer at end-->
  	<div class="text-center text-stone-800/70 text-sm py-4">
		&copy; 2024 PALMYRA. All rights reserved.
	</div>
</div>

