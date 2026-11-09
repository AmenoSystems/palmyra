-- ============================================================
-- PALMYRA — Supabase Setup SQL
-- Run these statements in the Supabase SQL editor (in order).
-- ============================================================

-- ── 1. CATEGORIES & SUBCATEGORIES ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.subcategories (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name        text NOT NULL,
  slug        text NOT NULL
);

-- Seed categories
INSERT INTO public.categories (name, slug) VALUES
  ('Electronics',       'electronics'),
  ('Fashion',           'fashion'),
  ('Home & Living',     'home-living'),
  ('Sports',            'sports'),
  ('Books',             'books'),
  ('Collectibles',      'collectibles'),
  ('Automotive',        'automotive'),
  ('Art & Crafts',      'art-crafts')
ON CONFLICT (slug) DO NOTHING;

-- Seed subcategories (insert after categories exist)
WITH cats AS (SELECT id, slug FROM public.categories)
INSERT INTO public.subcategories (category_id, name, slug)
SELECT c.id, s.name, s.slug FROM cats c JOIN (VALUES
  ('electronics', 'Phones & Tablets',       'phones-tablets'),
  ('electronics', 'Laptops & Computers',    'laptops-computers'),
  ('electronics', 'Audio & Headphones',     'audio-headphones'),
  ('electronics', 'Cameras',                'cameras'),
  ('electronics', 'Gaming',                 'gaming'),
  ('fashion',     'Men''s Clothing',        'mens-clothing'),
  ('fashion',     'Women''s Clothing',      'womens-clothing'),
  ('fashion',     'Shoes',                  'shoes'),
  ('fashion',     'Watches & Accessories',  'watches-accessories'),
  ('home-living', 'Furniture',              'furniture'),
  ('home-living', 'Kitchen & Dining',       'kitchen-dining'),
  ('home-living', 'Decor',                  'decor'),
  ('sports',      'Outdoor & Camping',      'outdoor-camping'),
  ('sports',      'Exercise & Fitness',     'exercise-fitness'),
  ('sports',      'Team Sports',            'team-sports'),
  ('books',       'Fiction',                'fiction'),
  ('books',       'Non-Fiction',            'non-fiction'),
  ('books',       'Textbooks',              'textbooks'),
  ('collectibles','Coins & Stamps',         'coins-stamps'),
  ('collectibles','Trading Cards',          'trading-cards'),
  ('collectibles','Vintage & Antiques',     'vintage-antiques'),
  ('automotive',  'Car Parts',              'car-parts'),
  ('automotive',  'Motorcycles',            'motorcycles'),
  ('art-crafts',  'Paintings',              'paintings'),
  ('art-crafts',  'Handmade Crafts',        'handmade-crafts')
) AS s(cat_slug, name, slug) ON c.slug = s.cat_slug
ON CONFLICT DO NOTHING;

-- ── 2. LISTING TAGS TABLE ──────────────────────────────────────
-- (if not already present from schema)
CREATE TABLE IF NOT EXISTS public.listing_tags (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  tag        text NOT NULL,
  UNIQUE(listing_id, tag)
);

-- ── 3. STORAGE BUCKET ─────────────────────────────────────────
-- Create via Supabase dashboard → Storage → New Bucket
-- Name: listing-images
-- Public: YES (so image URLs are publicly readable)
--
-- Or via SQL (requires superuser / service role):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('listing-images', 'listing-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- ── 4. RLS POLICIES ───────────────────────────────────────────

-- listings: anyone can read active listings
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active listings"
  ON public.listings FOR SELECT
  USING (status = 'active' AND now() BETWEEN start_date AND end_date);

CREATE POLICY "Sellers can insert their own listings"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can read their own listings (any status)"
  ON public.listings FOR SELECT
  USING (auth.uid() = seller_id);

-- listing_images: public read, authenticated insert
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read listing images"
  ON public.listing_images FOR SELECT USING (true);

CREATE POLICY "Sellers can insert images for their listings"
  ON public.listing_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id AND l.seller_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can delete their listing images"
  ON public.listing_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id AND l.seller_id = auth.uid()
    )
  );

-- listing_tags: public read, seller insert
ALTER TABLE public.listing_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read listing tags"
  ON public.listing_tags FOR SELECT USING (true);

CREATE POLICY "Sellers can insert tags for their listings"
  ON public.listing_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id AND l.seller_id = auth.uid()
    )
  );

-- categories + subcategories: public read only
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read categories" ON public.categories FOR SELECT USING (true);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read subcategories" ON public.subcategories FOR SELECT USING (true);

-- ── 5. STORAGE RLS ─────────────────────────────────────────────
-- In Supabase dashboard → Storage → listing-images → Policies:
--
-- Policy 1 (SELECT): Allow public reads
--   USING (true)
--
-- Policy 2 (INSERT): Allow authenticated uploads
--   WITH CHECK (auth.role() = 'authenticated')
--
-- Policy 3 (DELETE): Allow owner to delete
--   USING (auth.uid()::text = (storage.foldername(name))[1])
--   (Upload path convention: {user_id}/{listing_id}/{filename})

-- ── 6. PROFILE AUTO-CREATE TRIGGER ────────────────────────────
-- Creates a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 7. ORDERS TABLE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id  uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price       numeric NOT NULL,
  quantity    int NOT NULL DEFAULT 1,
  status      text NOT NULL DEFAULT 'Pending Seller Approval',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers can view their orders" ON public.orders;
CREATE POLICY "Buyers can view their orders" ON public.orders
  FOR SELECT USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Sellers can view incoming orders" ON public.orders;
CREATE POLICY "Sellers can view incoming orders" ON public.orders
  FOR SELECT USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Buyers can insert orders" ON public.orders;
CREATE POLICY "Buyers can insert orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Sellers can update their orders" ON public.orders;
CREATE POLICY "Sellers can update their orders" ON public.orders
  FOR UPDATE USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Buyers can update their orders" ON public.orders;
CREATE POLICY "Buyers can update their orders" ON public.orders
  FOR UPDATE USING (auth.uid() = buyer_id);

-- ── 8. CART ITEMS TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cart_items (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id  uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  quantity    int NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own cart" ON public.cart_items;
CREATE POLICY "Users can manage their own cart" ON public.cart_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
