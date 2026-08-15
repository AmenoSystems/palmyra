<!-- HamburgerMenu.svelte -->
<script lang="ts">
	import { Menu, X } from 'lucide-svelte';

	let { open = $bindable(false) } = $props();
</script>

<button
	onclick={() => (open = !open)}
	aria-label={open ? 'Close menu' : 'Open menu'}
	aria-expanded={open}
	class="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-stone-200/70 dark:hover:bg-stone-700/50"
>
	{#if open}
		<X class="h-5 w-5 transition-transform duration-300" />
	{:else}
		<Menu class="h-5 w-5 transition-transform duration-300" />
	{/if}
</button>