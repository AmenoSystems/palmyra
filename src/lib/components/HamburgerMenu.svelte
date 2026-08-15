<script lang="ts">
	let { open = $bindable(false) } = $props();
</script>

<button
	onclick={() => (open = !open)}
	aria-label={open ? 'Close menu' : 'Open menu'}
	aria-expanded={open}
	class="hamburger-btn"
>
	<span class="bar" class:open></span>
	<span class="bar mid" class:open></span>
	<span class="bar" class:open></span>
</button>

<style>
	.hamburger-btn {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 5px;
		width: 36px;
		height: 36px;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 4px;
		border-radius: 8px;
		transition: background 0.2s;
	}

	.hamburger-btn:hover {
		background: rgba(120, 100, 80, 0.15);
	}

	.bar {
		display: block;
		width: 22px;
		height: 2px;
		border-radius: 2px;
		background: currentColor;
		transition:
			transform 0.3s cubic-bezier(0.23, 1, 0.32, 1),
			opacity 0.2s ease,
			width 0.3s ease;
		transform-origin: center;
	}

	/* Top bar rotates to \ */
	.bar:first-child.open {
		transform: translateY(7px) rotate(45deg);
	}

	/* Middle bar fades out */
	.bar.mid.open {
		opacity: 0;
		width: 0;
	}

	/* Bottom bar rotates to / */
	.bar:last-child.open {
		transform: translateY(-7px) rotate(-45deg);
	}
</style>
