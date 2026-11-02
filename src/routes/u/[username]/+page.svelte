<script lang="ts">
  let { data } = $props();
  let profile = $derived(data.profile);
</script>

<svelte:head>
  <title>{profile.username}'s Profile | Palmyra</title>
</svelte:head>

<main class="profile">
  <img
    src={profile.avatar_url ?? '/default-avatar.png'}
    alt="{profile.username}'s avatar"
    width="96"
    height="96"
  />

  <h1>{profile.full_name ?? profile.username}</h1>
  <p>@{profile.username}</p>

  {#if profile.bio}
    <p>{profile.bio}</p>
  {/if}

  <p>
    ⭐ {Number(profile.rating ?? 0).toFixed(1)} ({profile.total_reviews ?? 0} reviews)
  </p>

  {#if profile.created_at}
    <p>Member since {new Date(profile.created_at).toLocaleDateString()}</p>
  {/if}
</main>

<style>
  .profile {
    max-width: 600px;
    margin: 2rem auto;
    text-align: center;
  }
  img {
    border-radius: 50%;
    object-fit: cover;
  }
</style>