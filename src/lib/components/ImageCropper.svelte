<script lang="ts">
	/**
	 * ImageCropper — canvas-based 4:3 crop
	 * Outputs a compressed WebP blob at target dimensions.
	 *
	 * Canonical aspect ratio: 4:3 (width / height = 1.333…)
	 * Output size: 800×600px WebP at 85% quality
	 */
	import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-svelte';

	interface Props {
		src: string;                          // object URL or data URL of source image
		onCrop: (blob: Blob) => void;         // called with the cropped blob
		onCancel: () => void;
	}

	let { src, onCrop, onCancel }: Props = $props();

	// ── Output config ─────────────────────────────────────────────
	const OUTPUT_W = 800;
	const OUTPUT_H = 600;  // 4:3
	const OUTPUT_QUALITY = 0.85;

	// ── State ─────────────────────────────────────────────────────
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let containerEl = $state<HTMLDivElement | null>(null);

	// Crop region in image-space (px)
	let imgW = $state(0);
	let imgH = $state(0);

	// Pan / zoom state
	let scale = $state(1);          // zoom level
	let offsetX = $state(0);        // pan offset (image-space)
	let offsetY = $state(0);

	// Drag state
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);
	let dragOffsetX = $state(0);
	let dragOffsetY = $state(0);

	// The crop frame size in display pixels (shown on canvas)
	let displayW = $state(0);
	let displayH = $state(0);

	// Loaded image element
	let imgEl = $state<HTMLImageElement | null>(null);
	let isReady = $state(false);

	// ── Load image ─────────────────────────────────────────────────
	$effect(() => {
		const img = new Image();
		img.onload = () => {
			imgEl = img;
			imgW = img.naturalWidth;
			imgH = img.naturalHeight;
			isReady = true;
			resetView();
			draw();
		};
		img.src = src;
	});

	// ── Fit to container ──────────────────────────────────────────
	function resetView() {
		if (!canvasEl || !containerEl) return;
		const cw = containerEl.clientWidth;
		const ch = Math.min(cw * (3 / 4), window.innerHeight * 0.55);
		displayW = cw;
		displayH = ch;
		canvasEl.width = cw;
		canvasEl.height = ch;

		// Fit the image so that 4:3 crop covers the whole frame
		const scaleX = cw / imgW;
		const scaleY = ch / imgH;
		scale = Math.max(scaleX, scaleY);
		offsetX = 0;
		offsetY = 0;
	}

	// ── Draw ──────────────────────────────────────────────────────
	function draw() {
		if (!canvasEl || !imgEl) return;
		const ctx = canvasEl.getContext('2d')!;
		const cw = canvasEl.width;
		const ch = canvasEl.height;

		ctx.clearRect(0, 0, cw, ch);

		// Scaled image dimensions
		const sw = imgW * scale;
		const sh = imgH * scale;

		// Center the image then apply pan offset
		const dx = cw / 2 - sw / 2 + offsetX;
		const dy = ch / 2 - sh / 2 + offsetY;

		// Draw dim overlay first
		ctx.save();
		ctx.globalAlpha = 0.45;
		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, cw, ch);
		ctx.restore();

		// Draw the image
		ctx.drawImage(imgEl, dx, dy, sw, sh);

		// Punch a "bright" hole for the crop frame (4:3 ratio centred)
		// Draw crop border
		ctx.save();
		ctx.strokeStyle = 'rgba(255,255,255,0.9)';
		ctx.lineWidth = 2;
		ctx.setLineDash([]);
		ctx.strokeRect(0, 0, cw, ch);
		// Rule-of-thirds grid
		ctx.strokeStyle = 'rgba(255,255,255,0.3)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(cw / 3, 0); ctx.lineTo(cw / 3, ch);
		ctx.moveTo(2 * cw / 3, 0); ctx.lineTo(2 * cw / 3, ch);
		ctx.moveTo(0, ch / 3); ctx.lineTo(cw, ch / 3);
		ctx.moveTo(0, 2 * ch / 3); ctx.lineTo(cw, 2 * ch / 3);
		ctx.stroke();
		ctx.restore();
	}

	// Re-draw when state changes
	$effect(() => {
		if (isReady) {
			// Track reactive vars
			const _ = [scale, offsetX, offsetY];
			draw();
		}
	});

	// ── Zoom ─────────────────────────────────────────────────────
	function zoomIn() { scale = Math.min(scale * 1.15, 5); clampOffset(); }
	function zoomOut() { scale = Math.max(scale / 1.15, getMinScale()); clampOffset(); }

	function getMinScale() {
		if (!canvasEl) return 1;
		return Math.max(canvasEl.width / imgW, canvasEl.height / imgH);
	}

	function clampOffset() {
		if (!canvasEl) return;
		const cw = canvasEl.width;
		const ch = canvasEl.height;
		const sw = imgW * scale;
		const sh = imgH * scale;
		const maxX = sw / 2 - cw / 2;
		const maxY = sh / 2 - ch / 2;
		offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
		offsetY = Math.max(-maxY, Math.min(maxY, offsetY));
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY < 0 ? 1.08 : 0.93;
		scale = Math.max(getMinScale(), Math.min(5, scale * delta));
		clampOffset();
	}

	// ── Pan (mouse + touch) ───────────────────────────────────────
	function onPointerDown(e: PointerEvent) {
		isDragging = true;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		dragOffsetX = offsetX;
		dragOffsetY = offsetY;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!isDragging) return;
		offsetX = dragOffsetX + (e.clientX - dragStartX);
		offsetY = dragOffsetY + (e.clientY - dragStartY);
		clampOffset();
	}

	function onPointerUp() {
		isDragging = false;
	}

	// ── Produce cropped blob ──────────────────────────────────────
	function applyCrop() {
		if (!canvasEl || !imgEl) return;
		const cw = canvasEl.width;
		const ch = canvasEl.height;
		const sw = imgW * scale;
		const sh = imgH * scale;
		const dx = cw / 2 - sw / 2 + offsetX;
		const dy = ch / 2 - sh / 2 + offsetY;

		// Crop region in image-space
		const cropX = -dx / scale;
		const cropY = -dy / scale;
		const cropW = cw / scale;
		const cropH = ch / scale;

		// Render at output resolution (800×600)
		const offscreen = document.createElement('canvas');
		offscreen.width = OUTPUT_W;
		offscreen.height = OUTPUT_H;
		const ctx = offscreen.getContext('2d')!;
		ctx.drawImage(imgEl, cropX, cropY, cropW, cropH, 0, 0, OUTPUT_W, OUTPUT_H);
		offscreen.toBlob(
			(blob) => { if (blob) onCrop(blob); },
			'image/webp',
			OUTPUT_QUALITY
		);
	}
</script>

<!-- Cropper overlay -->
<div class="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Crop image">
	<div class="w-full max-w-lg">
		<!-- Header -->
		<div class="flex items-center justify-between mb-3">
			<span class="text-white font-medium text-sm">Crop Image (4:3)</span>
			<button onclick={onCancel} class="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Cancel crop">
				<X class="w-5 h-5" />
			</button>
		</div>

		<!-- Canvas -->
		<div
			bind:this={containerEl}
			class="relative w-full overflow-hidden rounded-xl cursor-grab active:cursor-grabbing touch-none"
			style="aspect-ratio: 4/3;"
		>
			<canvas
				bind:this={canvasEl}
				class="w-full h-full block"
				onwheel={handleWheel}
				onpointerdown={onPointerDown}
				onpointermove={onPointerMove}
				onpointerup={onPointerUp}
				onpointercancel={onPointerUp}
			></canvas>
			{#if !isReady}
				<div class="absolute inset-0 flex items-center justify-center">
					<span class="inline-block w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
				</div>
			{/if}
		</div>

		<!-- Controls -->
		<div class="flex items-center justify-between mt-4 gap-3">
			<div class="flex items-center gap-2">
				<button onclick={zoomOut} class="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Zoom out">
					<ZoomOut class="w-5 h-5" />
				</button>
				<span class="text-white/60 text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
				<button onclick={zoomIn} class="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Zoom in">
					<ZoomIn class="w-5 h-5" />
				</button>
				<button onclick={resetView} class="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Reset view">
					<RotateCcw class="w-4 h-4" />
				</button>
			</div>

			<div class="flex gap-2">
				<button
					onclick={onCancel}
					class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors min-h-[44px]"
				>Cancel</button>
				<button
					onclick={applyCrop}
					class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors min-h-[44px]"
				>Apply Crop</button>
			</div>
		</div>
		<p class="text-center text-white/40 text-xs mt-2">Drag to pan · scroll or pinch to zoom</p>
	</div>
</div>
