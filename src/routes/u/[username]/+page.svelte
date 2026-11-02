<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  let { data } = $props();
  let profile = $derived(data.profile);

  let avatarUrl = $derived(
    profile.avatar_id
      ? supabase.storage.from('profile_pictures').getPublicUrl(profile.avatar_id).data.publicUrl
      : supabase.storage.from('profile_pictures').getPublicUrl('default-user.png').data.publicUrl
  );
</script>

<svelte:head>
  <title>{profile.username}'s Profile | Palmyra</title>
</svelte:head>

<div>
  <!-- Left Column Box -->
  <div class="mb-5 backdrop-blur-lg bg-stone-200/30 dark:bg-stone-500/30 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30 p-6 md:p-8 max-w-xs align-self-start">
    <div class="text-stone-800 dark:text-gray-300">
      <img src={avatarUrl} alt="Profile Avatar" class="w-32 h-32 rounded-full mx-auto mb-4" />
      <h2 class="text-xl font-bold mb-2 text-center">@{profile.username}</h2>
      <p class="text-center text-gray-600 dark:text-gray-400 mb-4">{profile.bio}</p>
    </div>
</div>
</div>