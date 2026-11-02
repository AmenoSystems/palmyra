<script lang="ts">
	/**
	 * ImageUploader
	 * - Native camera capture + file picker
	 * - Client-side 4:3 crop (via ImageCropper)
	 * - Client-side WebP compression
	 * - Per-image progress + retry
	 * - Primary-image selection + drag-reorder
	 * - Parallel uploads to Supabase Storage bucket "listing-images"
	 */
	import { supabase } from '$lib/supabaseClient';
	import ImageCropper from './ImageCropper.svelte';
	import { X, Camera, Upload, Star, GripVertical, RotateCcw, CheckCircle, AlertCircle } from 'lucide-svelte';

	interface UploadedImage {
		id: string;
		previewUrl: string;   // object URL of cropped blob (for preview)
		blob: Blob;
		status: 'pending' | 'uploading' | 'done' | 'error';
		progress: number;     // 0–100
		publicUrl: string;
		error: string;
		isPrimary: boolean;
	}

	interface Props {
		listingId: string;           // needed for storage path
		userId: string;
		onImagesReady: (images: { url: string; isPrimary: boolean; displayOrder: number }[]) => void;
		maxImages?: number;
	}

	let { listingId, userId, onImagesReady, maxImages = 8 }: Props = $props();

	let images = $state<UploadedImage[]>([]);
	let cropQueue = $state<string[]>([]);      // object URLs awaiting crop
	let currentCropSrc = $state<string | null>(null);

	let fileInputEl = $state<HTMLInputElement | null>(null);
	let cameraInputEl = $state<HTMLInputElement | null>(null);

	// Drag-reorder
	let dragIdx = $state<number | null>(null);
	let dropIdx = $state<number | null>(null);

	// ── Pick files ─────────────────────────────────────────────────
	function pickFiles() {
		fileInputEl?.click();
	}

	function pickCamera() {
		cameraInputEl?.click();
	}

	function handleFilesSelected(e: Event) {
		const files = Array.from((e.target as HTMLInputElement).files ?? []);
		(e.target as HTMLInputElement).value = '';  // reset so same file can be picked again
		enqueueFiles(files);
	}

	function enqueueFiles(files: File[]) {
		const remaining = maxImages - images.length - cropQueue.length;
		const toProcess = files.slice(0, remaining);
		for (const file of toProcess) {
			const objUrl = URL.createObjectURL(file);
			cropQueue = [...cropQueue, objUrl];
		}
		advanceCropQueue();
	}

	function advanceCropQueue() {
		if (!currentCropSrc && cropQueue.length > 0) {
			currentCropSrc = cropQueue[0];
			cropQueue = cropQueue.slice(1);
		}
	}

	// ── Crop callback ─────────────────────────────────────────────
	function onCropped(blob: Blob) {
		if (currentCropSrc) URL.revokeObjectURL(currentCropSrc);
		currentCropSrc = null;

		const id = crypto.randomUUID();
		const previewUrl = URL.createObjectURL(blob);
		const img: UploadedImage = {
			id, previewUrl, blob,
			status: 'pending',
			progress: 0,
			publicUrl: '',
			error: '',
			isPrimary: images.length === 0   // first image is primary by default
		};
		images = [...images, img];
		uploadImage(id);
		advanceCropQueue();
	}

	function onCropCancelled() {
		if (currentCropSrc) URL.revokeObjectURL(currentCropSrc);
		currentCropSrc = null;
		advanceCropQueue();
	}

	// ── Upload ────────────────────────────────────────────────────
	async function uploadImage(id: string) {
		const idx = images.findIndex(i => i.id === id);
		if (idx === -1) return;
		images[idx] = { ...images[idx], status: 'uploading', progress: 10, error: '' };

		const img = images[idx];
		const filename = `${id}.webp`;
		const path = `${userId}/${listingId}/${filename}`;

		try {
			// Simulate progress during upload (Supabase JS doesn't expose XHR progress)
			const progressInterval = setInterval(() => {
				images = images.map(i =>
					i.id === id && i.progress < 85 ? { ...i, progress: i.progress + 15 } : i
				);
			}, 300);

			const { error: uploadError } = await supabase.storage
				.from('listing-images')
				.upload(path, img.blob, {
					contentType: 'image/webp',
					upsert: false
				});

			clearInterval(progressInterval);

			if (uploadError) throw uploadError;

			const { data: urlData } = supabase.storage
				.from('listing-images')
				.getPublicUrl(path);

			images = images.map(i =>
				i.id === id
					? { ...i, status: 'done', progress: 100, publicUrl: urlData.publicUrl }
					: i
			);
			notifyParent();
		} catch (err) {
			images = images.map(i =>
				i.id === id
					? { ...i, status: 'error', progress: 0, error: err instanceof Error ? err.message : 'Upload failed' }
					: i
			);
		}
	}

	async function retryUpload(id: string) {
		uploadImage(id);
	}

	// ── Remove ────────────────────────────────────────────────────
	function removeImage(id: string) {
		const img = images.find(i => i.id === id);
		if (img) URL.revokeObjectURL(img.previewUrl);
		images = images.filter(i => i.id !== id);
		// Ensure primary is assigned
		if (images.length > 0 && !images.some(i => i.isPrimary)) {
			images[0] = { ...images[0], isPrimary: true };
		}
		notifyParent();
	}

	// ── Primary selection ─────────────────────────────────────────
	function setPrimary(id: string) {
		images = images.map(i => ({ ...i, isPrimary: i.id === id }));
		notifyParent();
	}

	// ── Drag-reorder ──────────────────────────────────────────────
	function onDragStart(idx: number) {
		dragIdx = idx;
	}

	function onDragOver(e: DragEvent, idx: number) {
		e.preventDefault();
		dropIdx = idx;
	}

	function onDrop(idx: number) {
		if (dragIdx === null || dragIdx === idx) { dragIdx = null; dropIdx = null; return; }
		const reordered = [...images];
		const [moved] = reordered.splice(dragIdx, 1);
		reordered.splice(idx, 0, moved);
		images = reordered;
		dragIdx = null;
		dropIdx = null;
		notifyParent();
	}

	// ── Notify parent of ready images ─────────────────────────────
	function notifyParent() {
		const ready = images
			.filter(i => i.status === 'done')
			.map((i, order) => ({ url: i.publicUrl, isPrimary: i.isPrimary, displayOrder: order }));
		onImagesReady(ready);
	}

	let allDone = $derived(images.length > 0 && images.every(i => i.status === 'done'));
</script>

<!-- Hidden file inputs -->
<input
	bind:this={fileInputEl}
	type="file"
	accept="image/*"
	multiple
	class="hidden"
	onchange={handleFilesSelected}
/>
<input
	bind:this={cameraInputEl}
	type="file"
	accept="image/*"
	capture="environment"
	class="hidden"
	onchange={handleFilesSelected}
/>

<!-- Crop overlay -->
{#if currentCropSrc}
	<ImageCropper src={currentCropSrc} onCrop={onCropped} onCancel={onCropCancelled} />
{/if}

<div class="space-y-4">
	<!-- Upload buttons -->
	{#if images.length < maxImages}
		<div class="flex gap-3">
			<button
				type="button"
				onclick={pickCamera}
				class="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors text-stone-500 dark:text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 min-h-[80px]"
			>
				<Camera class="w-6 h-6" />
				<span class="text-xs font-medium">Camera</span>
			</button>
			<button
				type="button"
				onclick={pickFiles}
				class="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors text-stone-500 dark:text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 min-h-[80px]"
			>
				<Upload class="w-6 h-6" />
				<span class="text-xs font-medium">Choose Files</span>
			</button>
		</div>
		<p class="text-xs text-stone-400 dark:text-stone-500 text-center">
			{images.length}/{maxImages} images · All cropped to 4:3 · Drag to reorder
		</p>
	{/if}

	<!-- Image grid -->
	{#if images.length > 0}
		<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
			{#each images as img, idx (img.id)}
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<div
					class="relative rounded-xl overflow-hidden border-2 transition-colors {dropIdx === idx ? 'border-indigo-400' : 'border-transparent'} {img.isPrimary ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}"
					draggable="true"
					ondragstart={() => onDragStart(idx)}
					ondragover={(e) => onDragOver(e, idx)}
					ondrop={() => onDrop(idx)}
				>
					<!-- 4:3 image container -->
					<div class="aspect-[4/3] w-full bg-stone-200 dark:bg-stone-700">
						<img src={img.previewUrl} alt="Listing" class="w-full h-full object-cover" loading="lazy" />
					</div>

					<!-- Overlay for non-done states -->
					{#if img.status === 'uploading'}
						<div class="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
							<span class="inline-block w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
							<div class="w-3/4 h-1 bg-white/20 rounded-full overflow-hidden">
								<div class="h-full bg-white rounded-full transition-all duration-300" style="width: {img.progress}%"></div>
							</div>
						</div>
					{:else if img.status === 'error'}
						<div class="absolute inset-0 bg-red-900/60 flex flex-col items-center justify-center gap-2 p-2">
							<AlertCircle class="w-6 h-6 text-white" />
							<p class="text-white text-xs text-center line-clamp-2">{img.error}</p>
							<button
								type="button"
								onclick={() => retryUpload(img.id)}
								class="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-full transition-colors min-h-[32px]"
							>
								<RotateCcw class="w-3 h-3" /> Retry
							</button>
						</div>
					{:else if img.status === 'done'}
						<div class="absolute top-1.5 left-1.5">
							<CheckCircle class="w-4 h-4 text-green-400 drop-shadow" />
						</div>
					{/if}

					<!-- Controls bar -->
					<div class="absolute bottom-0 inset-x-0 flex items-center justify-between px-1.5 py-1 bg-black/40">
						<!-- Drag handle -->
						<GripVertical class="w-4 h-4 text-white/70 cursor-grab" />

						<!-- Primary star -->
						<button
							type="button"
							onclick={() => setPrimary(img.id)}
							class="p-1 rounded-full hover:bg-white/20 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
							title={img.isPrimary ? 'Primary image' : 'Set as primary'}
							aria-label={img.isPrimary ? 'Primary image' : 'Set as primary'}
						>
							<Star class="w-4 h-4 {img.isPrimary ? 'fill-yellow-400 text-yellow-400' : 'text-white/60'}" />
						</button>

						<!-- Remove -->
						<button
							type="button"
							onclick={() => removeImage(img.id)}
							class="p-1 rounded-full hover:bg-red-500/60 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
							aria-label="Remove image"
						>
							<X class="w-4 h-4 text-white" />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
