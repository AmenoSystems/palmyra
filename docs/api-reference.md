# Palmyra — API, Routes & Query Reference

## Environment Variables

| Variable | Description | Where |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | Your project URL | `.env.local` |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Anon / publishable key | `.env.local` |

## Running Locally

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

---

## Image Aspect Ratio Convention

**4:3** (width : height) is the canonical ratio for all listing images.

- Enforced in `ImageCropper.svelte` before upload
- Card images: `aspect-[4/3] object-cover`
- Detail hero: `aspect-[4/3] object-cover`
- Thumbnails in gallery: `aspect-[4/3] object-cover`

Upload path in bucket `listing-images`:
```
{seller_user_id}/{listing_id}/{nanoid}.webp
```

---

## Storage

| Bucket | Public | Purpose |
|---|---|---|
| `listing-images` | ✅ | Listing photos (4:3 WebP) |
| `profile_pictures` | ✅ | User avatars |

---

## Tables Touched Per Flow

### Start Selling (create listing)
- **Read**: `categories`, `subcategories`
- **Write**: `listings`, `listing_images`, `listing_tags`
- **Storage**: Upload to `listing-images/{uid}/{listingId}/*.webp`

### Home / Browse (read active listings)
- **Read**: `listings` (status=active, within date window), `listing_images` (is_primary=true)

### Listing Detail
- **Read**: `listings`, `listing_images`, `listing_tags`, `profiles` (seller), `bids` (count)

### Auth Sign-In / Sign-Up
- Supabase Auth (`auth.users`, `profiles` via trigger)

### User Profile
- **Read**: `profiles`

---

## Routes

| Route | Type | Description |
|---|---|---|
| `/` | Page | Home — featured + recent listings |
| `/listings` | Page | Browse all active listings |
| `/listings/[slug]` | Page | Listing detail |
| `/sell` | Page (protected) | Create listing form |
| `/auth/signin` | Page | Full-page sign-in (with `?next=` param) |
| `/auth/callback` | Server | OAuth code exchange |
| `/auth/reset-password` | Page | Password reset |
| `/u/[username]` | Page | Seller profile |

---

## Server Queries

### `/` — Home page
```ts
// +page.server.ts
const { data } = await locals.supabase
  .from('listings')
  .select(`
    id, title, slug, condition, starting_price, current_price,
    buy_it_now_price, end_date, views,
    listing_images(image_url, is_primary, display_order),
    profiles(username, rating)
  `)
  .eq('status', 'active')
  .lte('start_date', new Date().toISOString())
  .gte('end_date', new Date().toISOString())
  .order('created_at', { ascending: false })
  .limit(12);
```

### `/listings` — Browse
Same query as above but with optional `category` / `search` filter params.

### `/listings/[slug]` — Detail
```ts
const { data } = await locals.supabase
  .from('listings')
  .select(`
    *,
    listing_images(id, image_url, is_primary, display_order),
    listing_tags(tag),
    profiles(id, username, full_name, avatar_id, rating, total_reviews)
  `)
  .eq('slug', slug)
  .single();
```

### `/sell` — Auth Guard
```ts
const user = await locals.getUser();
if (!user) redirect(303, `/auth/signin?next=/sell`);
```

### Listing Creation (POST to `/sell`)
```ts
// 1. Insert listing
const { data: listing } = await supabase
  .from('listings')
  .insert({ seller_id: user.id, subcategory_id, title, slug, ... })
  .select('id')
  .single();

// 2. Upload images to storage, save URLs
const imageUrl = supabase.storage
  .from('listing-images')
  .getPublicUrl(`${uid}/${listing.id}/${filename}`).data.publicUrl;

await supabase.from('listing_images')
  .insert({ listing_id, image_url, is_primary, display_order });

// 3. Insert tags
await supabase.from('listing_tags')
  .insert(tags.map(tag => ({ listing_id, tag })));
```

---

## RLS Policies Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `listings` | active+window OR own | own (`seller_id=uid`) | own | — |
| `listing_images` | all | own listing | — | own listing |
| `listing_tags` | all | own listing | — | own listing |
| `categories` | all | — | — | — |
| `subcategories` | all | — | — | — |
| `profiles` | all | trigger only | own | — |

Storage `listing-images`:
- SELECT: public
- INSERT: authenticated
- DELETE: `uid = foldername[0]`
