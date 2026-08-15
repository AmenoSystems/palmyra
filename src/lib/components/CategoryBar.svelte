<script lang="ts">
	let {
		activeCategory = $bindable('recentlylisted'),
		mobileOpen = $bindable(false)
	} = $props();

	const categories = [
		{ id: 'recentlylisted',         label: 'RecentlyListed' },
		{ id: 'electronics', label: 'Electronics' },
		{ id: 'fashion',     label: 'Fashion' },
		{ id: 'home',        label: 'Home & Living' },
		{ id: 'sports',      label: 'Sports' },
		{ id: 'books',       label: 'Books' },
		{ id: 'collectibles',label: 'Collectibles' },
		{ id: 'automotive',  label: 'Automotive' },
		{ id: 'art',         label: 'Art & Crafts' },
	];

	function select(label: string) {
		activeCategory = label;
		mobileOpen = false; // close mobile drawer after selection
	}
</script>

<!-- ─── Desktop: horizontal pill-bar ─── -->
<div class="desktop-bar">
	<div class="scroller" role="tablist" aria-label="Product categories">
		{#each categories as cat (cat.id)}
			<button
				role="tab"
				aria-selected={activeCategory === cat.label}
				onclick={() => select(cat.label)}
				class="pill"
				class:active={activeCategory === cat.label}
			>
				{cat.label}
			</button>
		{/each}
	</div>
</div>

<!-- ─── Mobile: dropdown panel (controlled by mobileOpen) ─── -->
<div class="mobile-panel" class:mobile-open={mobileOpen} aria-hidden={!mobileOpen}>
	<div class="mobile-inner">
		{#each categories as cat (cat.id)}
			<button
				onclick={() => select(cat.label)}
				class="mobile-pill"
				class:active={activeCategory === cat.label}
			>
				{cat.label}
			</button>
		{/each}
	</div>
</div>

<style>
	/* ── Desktop bar ── */
	.desktop-bar {
		display: flex;
		align-items: center;
		padding: 0 1rem;
	}

	.scroller {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
		padding: 6px 2px;
		flex: 1;
	}

	.scroller::-webkit-scrollbar {
		display: none;
	}

	.pill {
		flex-shrink: 0;
		padding: 5px 16px;
		border-radius: 9999px;
		font-size: 0.8125rem;
		font-weight: 500;
		letter-spacing: 0.01em;
		cursor: pointer;
		border: 1px solid transparent;
		background: transparent;
		color: inherit;
		transition:
			background 0.2s ease,
			color 0.2s ease,
			border-color 0.2s ease,
			box-shadow 0.2s ease;
		white-space: nowrap;
	}

	/* Light-mode idle */
	.pill {
		color: rgb(68 56 47);
		background: rgba(214, 205, 195, 0.35);
		border-color: rgba(255, 255, 255, 0.25);
	}

	:global(.dark) .pill {
		color: rgba(231, 222, 210, 0.85);
		background: rgba(100, 90, 80, 0.25);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.pill:hover:not(.active) {
		background: rgba(180, 165, 148, 0.45);
		border-color: rgba(255, 255, 255, 0.4);
	}

	:global(.dark) .pill:hover:not(.active) {
		background: rgba(120, 110, 98, 0.4);
	}

	/* Active pill */
	.pill.active {
		background: rgba(87, 67, 48, 0.75);
		color: #f5f0ea;
		border-color: rgba(255, 255, 255, 0.2);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
	}

	:global(.dark) .pill.active {
		background: rgba(210, 190, 165, 0.3);
		color: #ede8e0;
		border-color: rgba(210, 190, 165, 0.3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
	}

	/* ── Mobile panel ── */
	.mobile-panel {
		display: none; /* shown only on mobile */
		overflow: hidden;
		max-height: 0;
		transition: max-height 0.35s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.25s ease;
		opacity: 0;
	}

	.mobile-panel.mobile-open {
		max-height: 320px;
		opacity: 1;
	}

	.mobile-inner {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 10px 14px 14px;
	}

	.mobile-pill {
		padding: 6px 14px;
		border-radius: 9999px;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid rgba(255, 255, 255, 0.25);
		background: rgba(214, 205, 195, 0.35);
		color: rgb(68 56 47);
		transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
	}

	:global(.dark) .mobile-pill {
		color: rgba(231, 222, 210, 0.85);
		background: rgba(100, 90, 80, 0.25);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.mobile-pill.active {
		background: rgba(87, 67, 48, 0.75);
		color: #f5f0ea;
		border-color: rgba(255, 255, 255, 0.2);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
	}

	:global(.dark) .mobile-pill.active {
		background: rgba(210, 190, 165, 0.3);
		color: #ede8e0;
		border-color: rgba(210, 190, 165, 0.3);
	}

	/* Show mobile panel only on small screens */
	@media (max-width: 767px) {
		.desktop-bar {
			display: none;
		}
		.mobile-panel {
			display: block;
		}
	}
</style>
