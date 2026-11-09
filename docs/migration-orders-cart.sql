-- ============================================================
-- PALMYRA — Orders, Cart, Bids & Status Migration
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


-- ── 3. BIDS & BID HISTORY RLS POLICIES ─────────────────────────
-- Grants authenticated bidders permission to insert bids and read bid history
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read bids" ON public.bids;
CREATE POLICY "Anyone can read bids" ON public.bids
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert bids" ON public.bids;
CREATE POLICY "Authenticated users can insert bids" ON public.bids
  FOR INSERT WITH CHECK (auth.uid() = bidder_id);

ALTER TABLE public.bid_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read bid history" ON public.bid_history;
CREATE POLICY "Anyone can read bid history" ON public.bid_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert bid history" ON public.bid_history;
CREATE POLICY "Authenticated users can insert bid history" ON public.bid_history
  FOR INSERT WITH CHECK (true);


-- ── 3.1 AUTOMATIC CURRENT_PRICE TRIGGER & LISTINGS UPDATE POLICY ─
-- Trigger that automatically and securely updates listings.current_price
-- whenever a new bid is inserted by any authenticated user.
CREATE OR REPLACE FUNCTION public.handle_new_bid()
RETURNS trigger AS $$
BEGIN
  UPDATE public.listings
  SET current_price = NEW.amount,
      updated_at = now()
  WHERE id = NEW.listing_id
    AND (current_price IS NULL OR NEW.amount > current_price);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_bid_inserted ON public.bids;
CREATE TRIGGER on_bid_inserted
  AFTER INSERT ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_bid();

-- Allow authenticated users to update current_price on listings
DROP POLICY IF EXISTS "Authenticated users can update current_price on listings" ON public.listings;
CREATE POLICY "Authenticated users can update current_price on listings" ON public.listings
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ── 4. REALTIME PUBLICATIONS ──────────────────────────────────
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


-- ── 5. LISTING STATUS CONSTRAINT ───────────────────────────────
-- Broaden check constraint to permit inactive, ended, closed, draft, cancelled
DO $$
BEGIN
  ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_status_check;
  ALTER TABLE public.listings ADD CONSTRAINT listings_status_check 
    CHECK (status IN ('active', 'inactive', 'ended', 'closed', 'draft', 'cancelled', 'sold'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
