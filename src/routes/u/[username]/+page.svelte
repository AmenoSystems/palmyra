<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();
  let profile = $derived(data.profile);

  const tabs = [
    { id: 'posts', label: 'Profile Posts' },
    { id: 'listings', label: 'Listings' },
    { id: 'activity', label: 'Recent Activity' },
    { id: 'info', label: 'Information' }
  ] as const;

  let activeTab = $state<(typeof tabs)[number]['id']>('posts');

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  let joined = $derived(fmt(profile.created_at));

  function listingImage(l: any): string | null {
    const imgs = l.listing_images ?? [];
    return (imgs.find((i: any) => i.is_primary) ?? imgs[0])?.image_url ?? null;
  }

  const activityLabel: Record<string, string> = {
    listing_created: 'Listed an item',
    review_written: 'Wrote a review',
    post_written: 'Wrote a profile post',
    comment_written: 'Wrote a comment'
  };

  const card =
    'backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30';
  const muted = 'text-stone-500 dark:text-gray-400';
</script>

<svelte:head>
  <title>{profile.username}'s Profile | Palmyra</title>
</svelte:head>

{#snippet peopleBox(title: string, box: { count: number; items: { username: string; avatar: string }[] }, empty: string)}
  <div class={card}>
    <div class="flex items-center justify-between rounded-t-2xl bg-stone-700/80 px-4 py-2 text-white">
      <span class="font-semibold">{title}</span>
      <span class="rounded bg-white/20 px-2 text-sm">{box.count}</span>
    </div>
    <div class="p-4">
      {#if box.items.length === 0}
        <p class="text-sm {muted}">{empty}</p>
      {:else}
        <div class="grid grid-cols-3 gap-2">
          {#each box.items as p (p.username)}
            <a href="/{p.username}" title={p.username}>
              <img src={p.avatar} alt={p.username} class="aspect-square w-full rounded-lg object-cover" />
            </a>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/snippet}

<div class="mx-auto grid max-w-6xl gap-6 p-4 text-stone-800 md:grid-cols-[18rem_1fr] dark:text-gray-300">
  <!-- LEFT COLUMN -->
  <aside class="space-y-5">
    <div class="{card} p-5">
      <img
        src={data.avatarUrl}
        alt="{profile.username}'s avatar"
        class="mx-auto mb-4 h-40 w-40 rounded-2xl object-cover"
      />

      <dl class="space-y-1 text-sm">
        <div class="flex justify-between"><dt class={muted}>Joined</dt><dd>{joined}</dd></div>
        <div class="flex justify-between">
          <dt class={muted}>Rating</dt><dd>⭐ {Number(profile.rating ?? 0).toFixed(1)}</dd>
        </div>
        <div class="flex justify-between"><dt class={muted}>Reviews</dt><dd>{profile.total_reviews ?? 0}</dd></div>
        <div class="flex justify-between"><dt class={muted}>Active listings</dt><dd>{data.listings.length}</dd></div>
      </dl>

      {#if !data.isOwnProfile}
        <div class="mt-4 flex gap-2">
          <form method="POST" action={data.isFollowing ? '?/unfollow' : '?/follow'} use:enhance class="flex-1">
            <button
              type="submit"
              class="w-full rounded-lg px-3 py-2 text-sm font-medium
                {data.isFollowing
                ? 'border border-stone-400/50 hover:bg-stone-300/40'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'}"
            >
              {data.isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          </form>
          <button
            type="button"
            class="rounded-lg border border-stone-400/50 px-3 py-2 text-sm hover:bg-stone-300/40 dark:hover:bg-stone-600/40"
          >
            Report
          </button>
        </div>
        {#if form?.message}<p class="mt-2 text-sm text-red-500">{form.message}</p>{/if}
      {/if}
    </div>

    {@render peopleBox('Following', data.following, 'Not following anyone yet.')}
    {@render peopleBox('Followers', data.followers, 'No followers yet.')}
  </aside>

  <!-- MIDDLE CONTENT -->
  <section class="{card} p-6 md:p-8">
    <header class="mb-4">
      <h1 class="text-3xl font-bold">{profile.full_name ?? profile.username}</h1>
      <p class={muted}>@{profile.username}</p>
      {#if profile.bio}<p class="mt-2 italic">{profile.bio}</p>{/if}
    </header>

    <div class="mb-6 flex flex-wrap gap-1 border-b border-stone-400/40" role="tablist">
      {#each tabs as tab (tab.id)}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onclick={() => (activeTab = tab.id)}
          class="-mb-px rounded-t-lg border border-b-0 px-4 py-2 text-sm font-medium transition
            {activeTab === tab.id
            ? 'border-stone-400/40 bg-white/40 dark:bg-stone-700/40'
            : 'border-transparent hover:bg-white/20'}"
        >
          {tab.label}
        </button>
      {/each}
    </div>

    {#if activeTab === 'posts'}
      {#if data.isLoggedIn}
        <form method="POST" action="?/post" use:enhance={() => async ({ update }) => update({ reset: true })} class="mb-6">
          <textarea
            name="body"
            rows="3"
            maxlength="2000"
            required
            placeholder="Write something..."
            class="w-full rounded-lg border border-stone-400/40 bg-white/40 p-3 text-sm dark:bg-stone-700/40"
          ></textarea>
          <div class="mt-2 flex items-center justify-between">
            <span class="text-sm text-red-500">{form?.postError ?? ''}</span>
            <button type="submit" class="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Post
            </button>
          </div>
        </form>
      {:else}
        <p class="mb-6 text-sm {muted}">Log in to write on this profile.</p>
      {/if}

      {#if data.posts.length === 0}
        <p class={muted}>No profile posts yet.</p>
      {:else}
        <ul class="space-y-4">
          {#each data.posts as post (post.id)}
            <li class="flex gap-3 border-t border-stone-400/30 pt-4">
              <img src={post.authorAvatar} alt="" class="h-10 w-10 rounded-lg object-cover" />
              <div class="min-w-0">
                <p>
                  <a href="/{post.author}" class="font-semibold hover:underline">{post.author}</a>
                  <span class="ml-2 text-xs {muted}">{fmt(post.created_at)}</span>
                </p>
                <p class="whitespace-pre-wrap break-words">{post.body}</p>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    {:else if activeTab === 'listings'}
      {#if data.listings.length === 0}
        <p class={muted}>No active listings.</p>
      {:else}
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {#each data.listings as l (l.id)}
            {@const img = listingImage(l)}
            <a
              href="/listing/{l.slug}"
              class="overflow-hidden rounded-xl border border-stone-400/30 bg-white/30 transition hover:shadow-lg dark:bg-stone-700/30"
            >
              {#if img}
                <img src={img} alt={l.title} class="aspect-square w-full object-cover" />
              {:else}
                <div class="flex aspect-square items-center justify-center bg-stone-300/50 text-sm">No image</div>
              {/if}
              <div class="p-3">
                <p class="truncate font-medium">{l.title}</p>
                <p class="text-sm">₹{l.current_price ?? l.starting_price}</p>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    {:else if activeTab === 'activity'}
      {#if data.activity.length === 0}
        <p class={muted}>No recent activity.</p>
      {:else}
        <ul class="space-y-3">
          {#each data.activity as a (a.type + a.ref_id)}
            <li class="border-t border-stone-400/30 pt-3 text-sm">
              <p>
                <span class="font-medium">{activityLabel[a.type] ?? a.type}</span>
                <span class="ml-2 text-xs {muted}">{fmt(a.occurred_at)}</span>
              </p>
              {#if a.summary}<p class={muted}>{a.summary}</p>{/if}
            </li>
          {/each}
        </ul>
      {/if}
    {:else if activeTab === 'info'}
      <dl class="space-y-2 text-sm">
        <div class="flex gap-4"><dt class="w-28 {muted}">Username</dt><dd>{profile.username}</dd></div>
        {#if profile.full_name}
          <div class="flex gap-4"><dt class="w-28 {muted}">Name</dt><dd>{profile.full_name}</dd></div>
        {/if}
        <div class="flex gap-4"><dt class="w-28 {muted}">Member since</dt><dd>{joined}</dd></div>
        <div class="flex gap-4"><dt class="w-28 {muted}">Bio</dt><dd>{profile.bio ?? 'No bio yet.'}</dd></div>
      </dl>
    {/if}
  </section>
</div>