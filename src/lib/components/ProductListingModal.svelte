<script lang="ts">
	import {
		X,
		Upload,
		CheckCircle2,
		AlertCircle,
		Image as ImageIcon,
		DollarSign,
		Tag,
		Info
	} from 'lucide-svelte';
	import { supabase } from '$lib/supabaseClient';
	import { invalidateAll } from '$app/navigation';

	interface Props {
		open?: boolean;
		onClose?: () => void;
		onPublished?: () => void;
	}

	let { open = false, onClose = () => {}, onPublished = () => {} }: Props = $props();

	// State
	let title = $state('');
	let description = $state('');
	let condition = $state('brand_new');
	let startingPrice = $state('');
	let buyNowPrice = $state('');
	let reservePrice = $state('');
	let quantity = $state('1');
	let tags = $state('');
	let durationDays = $state('7');

	let categories = $state<{ id: string; name: string; slug: string }[]>([]);
	let subcategories = $state<{ id: string; category_id: string; name: string; slug: string }[]>([]);
	let selectedCategoryId = $state('');
	let selectedSubcategoryId = $state('');

	let filteredSubcategories = $derived(
		subcategories.filter((s) => s.category_id === selectedCategoryId)
	);

	let files = $state<File[]>([]);
	let previews = $state<string[]>([]);
	let isSubmitting = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	const CONDITIONS = [
		{ value: 'new', label: 'Brand New' },
		{ value: 'like_new', label: 'Like New' },
		{ value: 'good', label: 'Used - Good' },
		{ value: 'fair', label: 'Used - Fair' },
		{ value: 'poor', label: 'Poor' }
	];

	// Fetch categories when opened
	$effect(() => {
		if (open) {
			loadCategories();
		}
	});

	async function loadCategories() {
		const { data: cats } = await supabase.from('categories').select('id, name, slug').order('name');
		const { data: subs } = await supabase
			.from('subcategories')
			.select('id, category_id, name, slug')
			.order('name');
		if (cats) categories = cats;
		if (subs) subcategories = subs;
	}

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (!target.files) return;
		const selected = Array.from(target.files);
		files = [...files, ...selected].slice(0, 5);
		previews = files.map((f) => URL.createObjectURL(f));
	}

	function removeFile(index: number) {
		files = files.filter((_, i) => i !== index);
		previews = files.map((f) => URL.createObjectURL(f));
	}

	function resetForm() {
		title = '';
		description = '';
		condition = 'brand_new';
		startingPrice = '';
		buyNowPrice = '';
		reservePrice = '';
		quantity = '1';
		tags = '';
		selectedCategoryId = '';
		selectedSubcategoryId = '';
		files = [];
		previews = [];
		errorMessage = '';
		successMessage = '';
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		errorMessage = '';
		successMessage = '';

		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user) {
			errorMessage = 'You must be signed in to publish a product.';
			return;
		}

		if (!title.trim()) {
			errorMessage = 'Product title is required.';
			return;
		}
		if (!description.trim()) {
			errorMessage = 'Product description is required.';
			return;
		}
		if (!selectedSubcategoryId) {
			errorMessage = 'Please select a category and subcategory.';
			return;
		}
		const startPriceNum = parseFloat(startingPrice);
		if (isNaN(startPriceNum) || startPriceNum <= 0) {
			errorMessage = 'Starting price must be greater than 0.';
			return;
		}

		isSubmitting = true;

		try {
			// Generate slug
			const cleanBase = title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '')
				.slice(0, 50);
			const slug = `${cleanBase}-${Math.random().toString(36).substring(2, 8)}`;

			const now = new Date();
			const days = parseInt(durationDays) || 7;
			const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

			// 1. Insert listing record
			const { data: listing, error: insertError } = await supabase
				.from('listings')
				.insert({
					seller_id: user.id,
					subcategory_id: selectedSubcategoryId,
					title: title.trim(),
					slug,
					description: description.trim(),
					condition,
					starting_price: startPriceNum,
					current_price: startPriceNum,
					buy_it_now_price: buyNowPrice ? parseFloat(buyNowPrice) : null,
					reserve_price: reservePrice ? parseFloat(reservePrice) : null,
					quantity: parseInt(quantity) || 1,
					status: 'active',
					start_date: now.toISOString(),
					end_date: endDate.toISOString()
				})
				.select('id, slug')
				.single();

			if (insertError) throw new Error(insertError.message);

			// 2. Upload images to Supabase Storage if any
			if (files.length > 0) {
				const imageRecords = [];
				for (let i = 0; i < files.length; i++) {
					const file = files[i];
					const ext = file.name.split('.').pop() || 'jpg';
					const filename = `${crypto.randomUUID()}.${ext}`;
					const path = `${user.id}/${listing.id}/${filename}`;

					const { error: uploadErr } = await supabase.storage
						.from('listing-images')
						.upload(path, file, { contentType: file.type || 'image/jpeg' });

					if (!uploadErr) {
						const { data: urlData } = supabase.storage.from('listing-images').getPublicUrl(path);

						imageRecords.push({
							listing_id: listing.id,
							image_url: urlData.publicUrl,
							is_primary: i === 0,
							display_order: i
						});
					}
				}

				if (imageRecords.length > 0) {
					await supabase.from('listing_images').insert(imageRecords);
				}
			}

			// 3. Process tags
			if (tags.trim()) {
				const tagList = tags
					.split(',')
					.map((t) => t.trim().toLowerCase())
					.filter(Boolean)
					.slice(0, 8);

				for (const tagName of tagList) {
					try {
						let { data: existingTag } = await supabase
							.from('tags')
							.select('id')
							.eq('name', tagName)
							.maybeSingle();

						let tagId = existingTag?.id;
						if (!tagId) {
							const { data: newTag } = await supabase
								.from('tags')
								.insert({ name: tagName, slug: tagName.replace(/[^a-z0-9]+/g, '-') })
								.select('id')
								.maybeSingle();
							tagId = newTag?.id;
						}
						if (tagId) {
							await supabase.from('listing_tags').insert({
								listing_id: listing.id,
								tag_id: tagId
							});
						}
					} catch {
						// ignore tag error
					}
				}
			}

			// 4. Success state
			successMessage = 'Product published successfully!';
			await invalidateAll();
			onPublished();

			// Close modal after brief confirmation display
			setTimeout(() => {
				resetForm();
				onClose();
			}, 1200);
		} catch (err: any) {
			console.error('Publishing failed:', err);
			errorMessage = err.message || 'Failed to publish product. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="relative my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl sm:p-8 dark:border-stone-800 dark:bg-stone-900"
		>
			<!-- Close button -->
			<button
				type="button"
				onclick={onClose}
				class="absolute top-4 right-4 cursor-pointer rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
				aria-label="Close modal"
			>
				<X class="h-5 w-5" />
			</button>

			<!-- Header -->
			<div class="mb-6">
				<h2 class="flex items-center gap-2 text-2xl font-bold text-stone-900 dark:text-stone-50">
					<Upload class="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
					List Product for Sale
				</h2>
				<p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
					Fill out the details below to publish your item to the marketplace.
				</p>
			</div>

			<!-- Success Message -->
			{#if successMessage}
				<div
					class="mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"
				>
					<CheckCircle2 class="h-5 w-5 shrink-0" />
					<span class="font-medium">{successMessage} Closing...</span>
				</div>
			{/if}

			<!-- Error Message -->
			{#if errorMessage}
				<div
					class="mb-6 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400"
				>
					<AlertCircle class="mt-0.5 h-5 w-5 shrink-0" />
					<span>{errorMessage}</span>
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-4">
				<!-- Title -->
				<div>
					<label
						for="modal-title"
						class="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300"
					>
						Item Title *
					</label>
					<input
						id="modal-title"
						type="text"
						required
						placeholder="e.g. Vintage Leather Jacket, Sony WH-1000XM5"
						bind:value={title}
						class="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
					/>
				</div>

				<!-- Category & Subcategory -->
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div>
						<label
							for="modal-category"
							class="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300"
						>
							Category *
						</label>
						<select
							id="modal-category"
							required
							bind:value={selectedCategoryId}
							class="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
						>
							<option value="">Select Category</option>
							{#each categories as cat}
								<option value={cat.id}>{cat.name}</option>
							{/each}
						</select>
					</div>

					<div>
						<label
							for="modal-subcategory"
							class="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300"
						>
							Subcategory *
						</label>
						<select
							id="modal-subcategory"
							required
							bind:value={selectedSubcategoryId}
							disabled={!selectedCategoryId}
							class="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
						>
							<option value="">Select Subcategory</option>
							{#each filteredSubcategories as sub}
								<option value={sub.id}>{sub.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Description -->
				<div>
					<label
						for="modal-desc"
						class="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300"
					>
						Description *
					</label>
					<textarea
						id="modal-desc"
						rows="3"
						required
						placeholder="Details about condition, specs, accessories included..."
						bind:value={description}
						class="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
					></textarea>
				</div>

				<!-- Condition -->
				<div>
					<label
						for="modal-condition"
						class="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300"
					>
						Condition *
					</label>
					<select
						id="modal-condition"
						bind:value={condition}
						class="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
					>
						{#each CONDITIONS as c}
							<option value={c.value}>{c.label}</option>
						{/each}
					</select>
				</div>

				<!-- Pricing Grid -->
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<div>
						<label
							for="modal-start-price"
							class="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300"
						>
							Starting Bid (₹) *
						</label>
						<input
							id="modal-start-price"
							type="number"
							min="1"
							step="0.01"
							required
							placeholder="500"
							bind:value={startingPrice}
							class="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
						/>
					</div>

					<div>
						<label
							for="modal-buy-now"
							class="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300"
						>
							Buy Now Price (₹)
						</label>
						<input
							id="modal-buy-now"
							type="number"
							min="1"
							step="0.01"
							placeholder="Instant buy"
							bind:value={buyNowPrice}
							class="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
						/>
					</div>

					<div>
						<label
							for="modal-duration"
							class="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300"
						>
							Auction Duration
						</label>
						<select
							id="modal-duration"
							bind:value={durationDays}
							class="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
						>
							<option value="1">1 Day</option>
							<option value="3">3 Days</option>
							<option value="7">7 Days</option>
							<option value="14">14 Days</option>
							<option value="30">30 Days</option>
						</select>
					</div>
				</div>

				<!-- Image Upload -->
				<div>
					<span class="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300">
						Product Images (Max 5)
					</span>
					<div
						class="rounded-xl border-2 border-dashed border-stone-300 p-4 text-center dark:border-stone-700"
					>
						<input
							type="file"
							accept="image/*"
							multiple
							onchange={handleFileChange}
							class="hidden"
							id="modal-file-upload"
						/>
						<label
							for="modal-file-upload"
							class="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-stone-100 px-4 py-2 text-xs font-medium text-stone-800 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
						>
							<ImageIcon class="h-4 w-4" /> Choose Photos
						</label>
						<p class="mt-1 text-[11px] text-stone-400">JPEG, PNG, WebP up to 5MB each</p>

						{#if previews.length > 0}
							<div class="mt-3 flex flex-wrap justify-center gap-2">
								{#each previews as src, idx}
									<div
										class="relative h-12 w-16 overflow-hidden rounded-lg border border-stone-300 dark:border-stone-600"
									>
										<img {src} alt="Preview" class="h-full w-full object-cover" />
										<button
											type="button"
											onclick={() => removeFile(idx)}
											class="absolute top-0 right-0 rounded-bl bg-red-600 p-0.5 text-white"
										>
											<X class="h-3 w-3" />
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Tags -->
				<div>
					<label
						for="modal-tags"
						class="mb-1 block text-xs font-semibold text-stone-700 dark:text-stone-300"
					>
						Tags (comma-separated)
					</label>
					<input
						id="modal-tags"
						type="text"
						placeholder="vintage, electronics, sneakers"
						bind:value={tags}
						class="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
					/>
				</div>

				<!-- Actions -->
				<div
					class="flex items-center justify-end gap-3 border-t border-stone-200 pt-3 dark:border-stone-800"
				>
					<button
						type="button"
						onclick={onClose}
						disabled={isSubmitting}
						class="cursor-pointer rounded-xl border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
					>
						Cancel
					</button>

					<button
						type="submit"
						disabled={isSubmitting}
						class="flex cursor-pointer items-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-rose-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-95 disabled:opacity-50"
					>
						{#if isSubmitting}
							<span
								class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
							></span>
							Publishing...
						{:else}
							Publish Product
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
