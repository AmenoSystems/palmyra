<script>
  import { supabase } from '$lib/supabaseClient';

  // State management
  let activeTab = $state('list');
  let products = $state([]);
  let loading = $state(false);
  let submitting = $state(false);
  let errorMessage = $state('');

  // Form State
  let title = $state('');
  let description = $state('');
  let startingBid = $state('');
  let reservePrice = $state('');
  let buyNowPrice = $state('');
  let durationType = $state('hours');
  let durationValue = $state(24);

  async function fetchProducts() {
    loading = true;
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) errorMessage = error.message;
    else products = data;
    loading = false;
  }

  function calculateEndTime() {
    if (durationType === 'indefinite') return null;
    const now = new Date();
    const multiplier = durationType === 'hours' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    return new Date(now.getTime() + durationValue * multiplier).toISOString();
  }

  async function handleCreateListing(e) {
    e.preventDefault();
    submitting = true;
    errorMessage = '';

    const payload = {
      title,
      description,
      starting_bid: startingBid ? parseFloat(startingBid) : null,
      reserve_price: reservePrice ? parseFloat(reservePrice) : null,
      buy_now_price: buyNowPrice ? parseFloat(buyNowPrice) : null,
      ends_at: calculateEndTime(),
      is_indefinite: durationType === 'indefinite',
      status: 'active'
    };

    const { data, error } = await supabase.from('products').insert([payload]).select();

    if (error) errorMessage = error.message;
    else {
      products = [data[0], ...products];
      resetForm();
      activeTab = 'list';
    }
    submitting = false;
  }

  function resetForm() {
    title = '';
    description = '';
    startingBid = '';
    reservePrice = '';
    buyNowPrice = '';
    durationType = 'hours';
    durationValue = 24;
  }

  $effect(() => { fetchProducts(); });
</script>

<!-- Shared input classes (define once for reuse) -->


<div class="max-w-270 mx-auto my-8 px-4 font-sans">
  <header class="flex justify-between items-center mb-8">
    <div>
      <h1 class="text-2xl font-bold">Merchant Listings</h1>
      <p class="text-gray-500">Manage auction bids, buy-it-now options, and listing durations.</p>
    </div>
    <div class="flex gap-2">
      <button
        class="px-[1.2rem] py-[0.6rem] rounded-md border cursor-pointer font-medium transition-colors
               {activeTab === 'list'
                 ? 'bg-gray-900 text-white border-gray-900'
                 : 'bg-white border-gray-300 hover:bg-gray-50'}"
        onclick={() => (activeTab = 'list')}
      >
        View Listings
      </button>
      <button
        class="px-[1.2rem] py-[0.6rem] rounded-md border cursor-pointer font-medium transition-colors
               {activeTab === 'create'
                 ? 'bg-gray-900 text-white border-gray-900'
                 : 'bg-white border-gray-300 hover:bg-gray-50'}"
        onclick={() => (activeTab = 'create')}
      >
        + List New Item
      </button>
    </div>
  </header>

  {#if errorMessage}
    <div class="bg-red-100 text-red-800 p-3 rounded-md mb-6">{errorMessage}</div>
  {/if}

  {#if activeTab === 'create'}
    <section class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm max-w-160 mx-auto">
      <h2 class="text-xl font-bold mb-4">Create New Listing</h2>
      <form onsubmit={handleCreateListing}>
        <div class="flex flex-col mb-5">
          <label for="title" class="text-sm font-semibold mb-1.5">Item Title</label>
          <input id="title" bind:value={title} placeholder="e.g. Vintage Mechanical Keyboard" required
            class="p-[0.6rem] border border-gray-300 rounded-md text-[0.95rem] focus:outline-none focus:ring-2 focus:ring-gray-900/20" />
        </div>

        <div class="flex flex-col mb-5">
          <label for="desc" class="text-sm font-semibold mb-1.5">Description</label>
          <textarea id="desc" bind:value={description} rows="3"
            placeholder="Condition, specs, included accessories..."
            class="p-[0.6rem] border border-gray-300 rounded-md text-[0.95rem] focus:outline-none focus:ring-2 focus:ring-gray-900/20"></textarea>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div class="flex flex-col mb-5">
            <label for="start-bid" class="text-sm font-semibold mb-1.5">Starting Bid ($)</label>
            <input id="start-bid" type="number" step="0.01" min="0" bind:value={startingBid} placeholder="0.00"
              class="p-[0.6rem] border border-gray-300 rounded-md text-[0.95rem] focus:outline-none focus:ring-2 focus:ring-gray-900/20" />
          </div>
          <div class="flex flex-col mb-5">
            <label for="reserve-price" class="text-sm font-semibold mb-1.5">Reserve / End Bid ($)</label>
            <input id="reserve-price" type="number" step="0.01" min="0" bind:value={reservePrice}
              placeholder="Min price to win"
              class="p-[0.6rem] border border-gray-300 rounded-md text-[0.95rem] focus:outline-none focus:ring-2 focus:ring-gray-900/20" />
          </div>
          <div class="flex flex-col mb-5">
            <label for="buy-now" class="text-sm font-semibold mb-1.5">Buy Now Price ($)</label>
            <input id="buy-now" type="number" step="0.01" min="0" bind:value={buyNowPrice}
              placeholder="Instant buy price"
              class="p-[0.6rem] border border-gray-300 rounded-md text-[0.95rem] focus:outline-none focus:ring-2 focus:ring-gray-900/20" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col mb-5">
            <label for="duration-type" class="text-sm font-semibold mb-1.5">Listing Type</label>
            <select id="duration-type" bind:value={durationType}
              class="p-[0.6rem] border border-gray-300 rounded-md text-[0.95rem] focus:outline-none focus:ring-2 focus:ring-gray-900/20">
              <option value="hours">Specific Hours</option>
              <option value="days">Specific Days</option>
              <option value="indefinite">Indefinite (No End Date)</option>
            </select>
          </div>
          {#if durationType !== 'indefinite'}
            <div class="flex flex-col mb-5">
              <label for="duration-val" class="text-sm font-semibold mb-1.5">Duration ({durationType})</label>
              <input id="duration-val" type="number" min="1" bind:value={durationValue} required
                class="p-[0.6rem] border border-gray-300 rounded-md text-[0.95rem] focus:outline-none focus:ring-2 focus:ring-gray-900/20" />
            </div>
          {/if}
        </div>

        <button type="submit" disabled={submitting}
          class="w-full mt-2 px-[1.2rem] py-[0.6rem] rounded-md border cursor-pointer font-medium
                 bg-gray-900 text-white border-gray-900 hover:bg-gray-800
                 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
          {submitting ? 'Publishing...' : 'Publish Listing'}
        </button>
      </form>
    </section>
  {:else}
    {#if loading}
      <p class="text-gray-500 text-center py-8">Loading catalog...</p>
    {:else if products.length === 0}
      <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-center text-gray-500">
        <p>No listings active yet. Create your first product listing above.</p>
      </div>
    {:else}
      <div class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
        {#each products as item (item.id)}
          <article class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col justify-between">
            <div class="flex justify-between items-start">
              <h3 class="text-lg font-bold">{item.title}</h3>
              <span class="uppercase text-[0.7rem] px-2 py-[0.2rem] rounded-full bg-gray-200
                           {item.status === 'active' ? 'bg-green-100 text-green-800' : ''}">
                {item.status}
              </span>
            </div>

            <p class="text-gray-600 text-[0.9rem] my-3">{item.description || 'No description provided.'}</p>

            <div class="flex justify-between py-3 border-t border-b border-gray-100 mb-3">
              {#if item.starting_bid}
                <div class="flex flex-col text-[0.85rem]">
                  <span class="text-xs text-gray-500">Starting Bid</span>
                  <strong>${item.starting_bid}</strong>
                </div>
              {/if}
              {#if item.reserve_price}
                <div class="flex flex-col text-[0.85rem]">
                  <span class="text-xs text-gray-500">Reserve Bid</span>
                  <strong>${item.reserve_price}</strong>
                </div>
              {/if}
              {#if item.buy_now_price}
                <div class="flex flex-col text-[0.85rem]">
                  <span class="text-xs text-gray-500">Buy Now</span>
                  <strong class="text-blue-600">${item.buy_now_price}</strong>
                </div>
              {/if}
            </div>

            <div class="text-[0.8rem] text-gray-600">
              {#if item.is_indefinite}
                Listing: <strong>Indefinite</strong>
              {:else if item.ends_at}
                Ends: <strong>{new Date(item.ends_at).toLocaleString()}</strong>
              {/if}
            </div>
          </article>
        {/each}
      </div>
    {/if}
  {/if}
</div>