<!-- FabButton.svelte -->
<script lang="ts">
	import { Search } from 'lucide-svelte';

	type FloatingActionBarProps = {
		onClick?: (event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) => void;
		position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
		label?: string;
		open?: boolean;
	};

	let {
		onClick = () => {},
		position = 'bottom-right',
		label = 'Search',
		open = false
	}: FloatingActionBarProps = $props();
</script>

<button
	onclick={onClick}
	aria-label={label}
	class={`
		fixed z-50 flex items-center justify-center
		rounded-2xl shadow-lg transition-all duration-300 ease-in-out
		bg-stone-800 text-white hover:bg-stone-700 dark:bg-stone-200 dark:text-stone-800 dark:hover:bg-stone-300
		hover:scale-105 active:scale-95
		w-14 h-14
		${position === 'bottom-right' ? 'bottom-6 right-6' : ''}
		${position === 'bottom-left' ? 'bottom-6 left-6' : ''}
		${position === 'top-right' ? 'top-6 right-6' : ''}
		${position === 'top-left' ? 'top-6 left-6' : ''}
		${open ? 'rotate-90' : ''}
	`}
>
	<Search class="h-6 w-6 transition-transform duration-300" />
</button>