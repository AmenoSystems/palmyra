-- ============================================================
-- PALMYRA — Orders & Cart Migration
-- Run these statements in the Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================

-- ── 1. ORDERS TABLE ───────────────────────────────────────────
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

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies for orders
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


-- ── 2. CART ITEMS TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cart_items (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id  uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  quantity    int NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own cart" ON public.cart_items;
CREATE POLICY "Users can manage their own cart" ON public.cart_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 3. REALTIME PUBLICATIONS ──────────────────────────────────
-- Enable realtime for bids and orders (for live bid updates without page refresh)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bids'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'listings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
