<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import ImageUploader from '$lib/components/ImageUploader.svelte';
	import { ArrowLeft, Tag, Info, DollarSign, Calendar, Package, Image as ImageIcon } from 'lucide-svelte';

	let { data, form } = $props();

	// ── State ─────────────────────────────────────────────────────
	let step = $state(1);  // 1=images, 2=details, 3=pricing+dates
	const TOTAL_STEPS = 3;

	// Images (uploaded by ImageUploader)
	let uploadedImages = $state<{ url: string; isPrimary: boolean; displayOrder: number }[]>([]);
	let imagesJson = $derived(JSON.stringify(uploadedImages));

	// Category cascade
	let selectedCategoryId = $state('');
	let selectedSubcategoryId = $state('');
	let filteredSubcategories = $derived(
		data.subcategories.filter((s: any) => s.category_id === selectedCategoryId)
	);
	let selectedCatName = $derived(
		data.categories.find((c: any) => c.id === selectedCategoryId)?.name ?? '—'
	);
	let selectedSubName = $derived(
		data.subcategories.find((s: any) => s.id === selectedSubcategoryId)?.name ?? '—'
	);

	$effect(() => {
		// Reset subcategory when category changes
		if (selectedCategoryId) selectedSubcategoryId = '';
	});

	// Form fields
	let title = $state('');
	let description = $state('');
	let condition = $state('');
	let startingPrice = $state('');
	let buyItNowPrice = $state('');
	let reservePrice = $state('');
	let quantity = $state('1');
	let tags = $state('');

	// Dates — default to now → +7 days
	const now = new Date();
	const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
	let startDate = $state(toDatetimeLocal(now));
	let endDate = $state(toDatetimeLocal(weekLater));

	let isSubmitting = $state(false);

	function toDatetimeLocal(d: Date): string {
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	const CONDITIONS = [
		{ value: 'brand_new',   label: 'Brand New' },
		{ value: 'like_new',    label: 'Like New' },
		{ value: 'open_box',    label: 'New – Open Box' },
		{ value: 'used_good',   label: 'Used – Good' },
		{ value: 'used_fair',   label: 'Used – Fair' },
		{ value: 'for_parts',   label: 'For Parts / Not Working' }
	];

	// ── Navigation ────────────────────────────────────────────────
	function nextStep() {
		if (step < TOTAL_STEPS) step++;
	}

	function prevStep() {
		if (step > 1) step--;
	}

	function canProceedStep1(): boolean {
		return uploadedImages.length > 0 && uploadedImages.every(i => true /* already uploaded */);
	}

	function canProceedStep2(): boolean {
		return (
			title.trim().length >= 3 &&
			description.trim().length &&
			!!selectedSubcategoryId &&
			!!condition
		);
	}

	// ── Image callback ────────────────────────────────────────────
	function onImagesReady(imgs: typeof uploadedImages) {
		uploadedImages = imgs;
	}

	// ── Submit ────────────────────────────────────────────────────
	const listingId = crypto.randomUUID();  // generated on client for storage path
</script>

<svelte:head>
	<title>Create Listing | PALMYRA</title>
</svelte:head>

<div class="max-w-2xl mx-auto">
	<!-- Header -->
	<div class="flex items-center gap-3 mb-6">
		<button
			onclick={() => step > 1 ? prevStep() : goto('/')}
			class="p-2 rounded-full hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition-colors text-stone-700 dark:text-stone-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
			aria-label="Go back"
		>
			<ArrowLeft class="w-5 h-5" />
		</button>
		<div class="flex-1">
			<h1 class="text-xl font-bold text-stone-800 dark:text-stone-100">Create Listing</h1>
			<p class="text-xs text-stone-500 dark:text-stone-400">Step {step} of {TOTAL_STEPS}</p>
		</div>
	</div>

	<!-- Progress bar -->
	<div class="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full mb-6 overflow-hidden">
		<div
			class="h-full bg-linear-to-r from-indigo-500 to-rose-400 rounded-full transition-all duration-500"
			style="width: {(step / TOTAL_STEPS) * 100}%"
		></div>
	</div>

	<!-- Error from server action -->
	{#if form?.message}
		<div class="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400 text-sm">
			{form.message}
		</div>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}
	>
		<!-- Hidden fields -->
		<input type="hidden" name="images_json" value={imagesJson} />
		<input type="hidden" name="subcategory_id" value={selectedSubcategoryId} />
		<input type="hidden" name="condition" value={condition} />

		<!-- ── STEP 1: Images ──────────────────────────────────────── -->
		{#if step === 1}
			<div class="mb-5 backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-5">
				<div class="flex items-center gap-2 mb-4">
					<ImageIcon class="w-5 h-5 text-indigo-500" />
					<h2 class="font-semibold text-stone-800 dark:text-stone-100">Photos</h2>
					<span class="text-xs text-stone-500 dark:text-stone-400 ml-auto">All cropped to 4:3</span>
				</div>
				<ImageUploader
					{listingId}
					userId={data.user.id}
					onImagesReady={onImagesReady}
					maxImages={8}
				/>
			</div>

			<div class="flex justify-end">
				<button
					type="button"
					onclick={nextStep}
					disabled={uploadedImages.length === 0}
					class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors min-h-[48px]"
				>
					{uploadedImages.length === 0 ? 'Add at least 1 photo' : 'Next: Details →'}
				</button>
			</div>

		<!-- ── STEP 2: Details ─────────────────────────────────────── -->
		{:else if step === 2}
			<div class="mb-5 backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-5 space-y-5">
				<div class="flex items-center gap-2 mb-2">
					<Info class="w-5 h-5 text-indigo-500" />
					<h2 class="font-semibold text-stone-800 dark:text-stone-100">Item Details</h2>
				</div>

				<!-- Title -->
				<div>
					<label for="title" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">
						Title <span class="text-red-400">*</span>
					</label>
					<input
						id="title"
						name="title"
						type="text"
						required
						placeholder="e.g. Sony WH-1000XM5 Noise Cancelling Headphones"
						maxlength="120"
						bind:value={title}
						class="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm"
					/>
					<p class="text-xs text-stone-400 mt-1 text-right">{title.length}/120</p>
				</div>

				<!-- Description -->
				<div>
					<label for="description" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">
						Description <span class="text-red-400">*</span>
					</label>
					<textarea
						id="description"
						name="description"
						required
						placeholder="Describe your item — condition details, included accessories, defects…"
						rows="5"
						maxlength="2000"
						bind:value={description}
						class="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm resize-none"
					></textarea>
					<p class="text-xs text-stone-400 mt-1 text-right">{description.length}/2000</p>
				</div>

				<!-- Category → Subcategory (cascading) -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="category" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">
							Category <span class="text-red-400">*</span>
						</label>
						<select
							id="category"
							bind:value={selectedCategoryId}
							required
							class="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm"
						>
							<option value="">Select category</option>
							{#each data.categories as cat (cat.id)}
								<option value={cat.id}>{cat.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="subcategory" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">
							Subcategory <span class="text-red-400">*</span>
						</label>
						<select
							id="subcategory"
							bind:value={selectedSubcategoryId}
							required
							disabled={!selectedCategoryId}
							class="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm disabled:opacity-50"
						>
							<option value="">
								{selectedCategoryId ? 'Select subcategory' : 'Choose category first'}
							</option>
							{#each filteredSubcategories as sub (sub.id)}
								<option value={sub.id}>{sub.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Condition -->
				<div>
					<span class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-2">
						Condition <span class="text-red-400">*</span>
					</span>
					<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
						{#each CONDITIONS as cond}
							<button
								type="button"
								onclick={() => condition = cond.value}
								class="py-2.5 px-3 rounded-xl text-xs font-medium text-center transition-all duration-150 min-h-[44px] border {condition === cond.value
									? 'bg-indigo-600 text-white border-indigo-600'
									: 'bg-white/40 dark:bg-stone-700/30 text-stone-700 dark:text-stone-300 border-stone-300/50 dark:border-stone-600/50 hover:border-indigo-300'}"
							>
								{cond.label}
							</button>
						{/each}
					</div>
				</div>

				<!-- Tags -->
				<div>
					<label for="tags" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">
						Tags <span class="text-stone-400 font-normal">(optional, comma-separated)</span>
					</label>
					<div class="relative">
						<Tag class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
						<input
							id="tags"
							name="tags"
							type="text"
							placeholder="e.g. sony, headphones, wireless, noise-cancelling"
							bind:value={tags}
							class="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm"
						/>
					</div>
				</div>
			</div>

			<div class="flex gap-3 justify-between">
				<button type="button" onclick={prevStep} class="px-5 py-3 rounded-xl bg-stone-200/60 dark:bg-stone-700/40 text-stone-700 dark:text-stone-300 font-medium text-sm min-h-[48px]">← Back</button>
				<button
					type="button"
					onclick={nextStep}
					disabled={!canProceedStep2()}
					class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors min-h-[48px]"
				>Next: Pricing →</button>
			</div>

		<!-- ── STEP 3: Pricing + Dates ─────────────────────────────── -->
		{:else if step === 3}
			<div class="mb-5 backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-5 space-y-5">
				<div class="flex items-center gap-2 mb-2">
					<DollarSign class="w-5 h-5 text-indigo-500" />
					<h2 class="font-semibold text-stone-800 dark:text-stone-100">Pricing & Schedule</h2>
				</div>

				<!-- Starting price -->
				<div>
					<label for="starting_price" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">
						Starting Price <span class="text-red-400">*</span>
					</label>
					<div class="relative">
						<span class="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 dark:text-stone-400 font-medium">₹</span>
						<input
							id="starting_price"
							name="starting_price"
							type="number"
							required
							min="1"
							step="0.01"
							placeholder="0.00"
							bind:value={startingPrice}
							class="w-full pl-8 pr-4 py-3 rounded-xl bg-white/50 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm"
						/>
					</div>
				</div>

				<!-- Buy It Now + Reserve (optional) -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="buy_it_now_price" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">
							Buy It Now <span class="text-stone-400 font-normal">(optional)</span>
						</label>
						<div class="relative">
							<span class="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 dark:text-stone-400 font-medium">₹</span>
							<input
								id="buy_it_now_price"
								name="buy_it_now_price"
								type="number"
								min="1"
								step="0.01"
								placeholder="0.00"
								bind:value={buyItNowPrice}
								class="w-full pl-8 pr-4 py-3 rounded-xl bg-white/50 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm"
							/>
						</div>
					</div>
					<div>
						<label for="reserve_price" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">
							Reserve Price <span class="text-stone-400 font-normal">(optional)</span>
						</label>
						<div class="relative">
							<span class="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 dark:text-stone-400 font-medium">₹</span>
							<input
								id="reserve_price"
								name="reserve_price"
								type="number"
								min="1"
								step="0.01"
								placeholder="0.00"
								bind:value={reservePrice}
								class="w-full pl-8 pr-4 py-3 rounded-xl bg-white/50 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 placeholder:text-stone-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm"
							/>
						</div>
					</div>
				</div>

				<!-- Quantity -->
				<div>
					<label for="quantity" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">
						<Package class="inline w-3.5 h-3.5 mr-1" />Quantity
					</label>
					<input
						id="quantity"
						name="quantity"
						type="number"
						min="1"
						max="999"
						bind:value={quantity}
						class="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm"
					/>
				</div>

				<!-- Dates -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="start_date" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">
							<Calendar class="inline w-3.5 h-3.5 mr-1" />Start Date <span class="text-red-400">*</span>
						</label>
						<input
							id="start_date"
							name="start_date"
							type="datetime-local"
							required
							bind:value={startDate}
							class="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm"
						/>
					</div>
					<div>
						<label for="end_date" class="block text-xs font-medium text-stone-700 dark:text-stone-400 mb-1.5">
							<Calendar class="inline w-3.5 h-3.5 mr-1" />End Date <span class="text-red-400">*</span>
						</label>
						<input
							id="end_date"
							name="end_date"
							type="datetime-local"
							required
							bind:value={endDate}
							class="w-full px-4 py-3 rounded-xl bg-white/50 dark:bg-stone-700/40 border border-stone-300/50 dark:border-stone-600/50 text-stone-800 dark:text-stone-50 focus:outline-none focus:ring-2 focus:ring-indigo-300/50 transition-all text-sm"
						/>
					</div>
				</div>

				<!-- Preview summary -->
				<div class="p-3 rounded-xl bg-white/30 dark:bg-stone-700/20 border border-white/20 dark:border-stone-600/20 text-xs text-stone-600 dark:text-stone-400 space-y-1">
					<p><strong class="text-stone-700 dark:text-stone-300">Title:</strong> {title || '—'}</p>
					<p><strong class="text-stone-700 dark:text-stone-300">Category:</strong> {selectedCatName} &rarr; {selectedSubName}</p>
					<p><strong class="text-stone-700 dark:text-stone-300">Condition:</strong> {CONDITIONS.find(c => c.value === condition)?.label ?? '—'}</p>
					<p><strong class="text-stone-700 dark:text-stone-300">Starting price:</strong> ₹{startingPrice || '—'}</p>
					<p><strong class="text-stone-700 dark:text-stone-300">Photos:</strong> {uploadedImages.length} uploaded</p>
				</div>
			</div>

			<div class="flex gap-3 justify-between">
				<button type="button" onclick={prevStep} class="px-5 py-3 rounded-xl bg-stone-200/60 dark:bg-stone-700/40 text-stone-700 dark:text-stone-300 font-medium text-sm min-h-[48px]">← Back</button>
				<button
					type="submit"
					disabled={isSubmitting || !startingPrice}
					class="px-6 py-3 rounded-xl bg-linear-to-r from-indigo-500 to-rose-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all min-h-[48px] shadow-lg"
				>
					{#if isSubmitting}
						<span class="flex items-center gap-2">
							<span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
							Publishing…
						</span>
					{:else}
						🚀 Publish Listing
					{/if}
				</button>
			</div>
		{/if}
	</form>
</div>
