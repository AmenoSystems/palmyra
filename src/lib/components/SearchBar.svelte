<script lang="ts">
	import { onMount } from 'svelte';
    import { Command, X } from 'lucide-svelte';
	
	let searchQuery = $state('');
	let isFocused = $state(false);
	let inputRef: HTMLInputElement | undefined = $state();
	
	onMount(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 's') {
				e.preventDefault();
				inputRef?.focus();
			}
		};
		
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	});
	
	function handleSearch() {
		if (searchQuery.trim()) {
			console.log('Searching for:', searchQuery);
		}
	}
	
	function clearSearch() {
		searchQuery = '';
		inputRef?.focus();
	}
</script>

<div class="relative flex-1 max-w-2xl mx-4">
	<div
		class={`flex items-center backdrop-blur-lg bg-stone-200/30 rounded-full border border-white/20 dark:border-gray-700/30 transition-all duration-300 ${isFocused ? 'ring-2 ring-stone-400/50' : ''}`}
	>
		<!-- Search Icon -->
		<div class="pl-4 pr-2 text-stone-600/70">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
		</div>
		
		<!-- Search Input -->
		<input
			bind:this={inputRef}
			bind:value={searchQuery}
			type="text"
			placeholder="Search..."
			class="w-full py-2.5 px-2 bg-transparent text-stone-800 placeholder:text-stone-500/70 focus:outline-none text-sm"
			onfocus={() => isFocused = true}
			onblur={() => isFocused = false}
			onkeydown={(e) => e.key === 'Enter' && handleSearch()}
		/>

		<!-- Clear Button -->
		{#if searchQuery}
			<button
				onclick={clearSearch}
				class="mr-2 p-1 rounded-full hover:bg-stone-400/20 transition-colors text-stone-600/70"
				aria-label="Clear search"
			>
				<X class="w-4 h-4" />
			</button>
		{:else if !isFocused}
			<div class="pr-4 pl-2 text-xs text-stone-500/80 hidden sm:flex items-center gap-1">
                <div class="px-1.5 py-0.5 bg-stone-300/60 rounded-lg border border-stone-300/20 flex items-center gap-0.5">
                    <Command class="w-3.5 h-3.5" stroke-width={1.5} />
                    <span class="text-[14px] font-mono font-medium pt-0.5">S</span>
                </div>
	        </div>
		{/if}
		
		<!-- Search Button -->
		<button
			onclick={handleSearch}
			class="mr-1.5 px-4 py-1.5 rounded-full bg-stone-600/20 hover:bg-stone-600/30 transition-colors text-stone-800 text-sm font-medium"
			disabled={!searchQuery.trim()}
		>
			Search
		</button>
	</div>
</div>

<style>
	.ring-2 {
		--tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
		--tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
		box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
	}
</style>