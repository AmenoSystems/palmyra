#!/usr/bin/env python3
"""
Generate comprehensive project documentation for PALMYRA Auction Platform
in both DOCX (.docx) and PDF (.pdf) formats.
"""

import os
import subprocess
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

DOCS_DIR = os.path.dirname(os.path.abspath(__file__))
DOCX_PATH = os.path.join(DOCS_DIR, "Palmyra_Project_Documentation.docx")
HTML_PATH = os.path.join(DOCS_DIR, "Palmyra_Project_Documentation.html")
PDF_PATH = os.path.join(DOCS_DIR, "Palmyra_Project_Documentation.pdf")

def set_cell_background(cell, fill_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def build_docx():
    doc = docx.Document()
    
    # Page setup
    sections = doc.sections
    for s in sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)
        
    primary_color = RGBColor(30, 41, 59)     # Slate 800
    accent_color = RGBColor(79, 70, 229)     # Indigo 600
    text_color = RGBColor(51, 65, 85)        # Slate 700
    
    # ── COVER / TITLE ──────────────────────────────────────────────
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_p.paragraph_format.space_before = Pt(36)
    title_p.paragraph_format.space_after = Pt(8)
    run_sub = title_p.add_run("SOFTWARE ENGINEERING PROJECT SPECIFICATION & DESIGN DOCUMENTATION\n")
    run_sub.font.size = Pt(10)
    run_sub.font.bold = True
    run_sub.font.color.rgb = accent_color
    
    run_title = title_p.add_run("PALMYRA\nNext-Generation Online Auction & Marketplace Platform")
    run_title.font.size = Pt(24)
    run_title.font.bold = True
    run_title.font.color.rgb = primary_color
    
    subtitle_p = doc.add_paragraph()
    subtitle_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle_p.paragraph_format.space_after = Pt(28)
    run_desc = subtitle_p.add_run("Full-Stack Architecture with SvelteKit 2, Svelte 5 Runes, TypeScript, and Supabase Backend-as-a-Service")
    run_desc.font.size = Pt(12)
    run_desc.font.italic = True
    run_desc.font.color.rgb = RGBColor(100, 116, 139)
    
    # Meta box table
    meta_table = doc.add_table(rows=4, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_data = [
        ("Project Title:", "PALMYRA — Modern Full-Stack Auction & E-Commerce Web System"),
        ("System Architecture:", "Decoupled SSR/CSR Frontend (SvelteKit) + Supabase (PostgreSQL 15, Auth, Storage)"),
        ("Version & Status:", "v1.0.0 — Production Ready (Branch: sellerproduction)"),
        ("Document Release Date:", "November 2026")
    ]
    for i, (k, v) in enumerate(meta_data):
        row = meta_table.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(2.2)
        c1.width = Inches(4.5)
        set_cell_background(c0, "F1F5F9")
        set_cell_background(c1, "F8FAFC")
        set_cell_margins(c0, 80, 80, 120, 120)
        set_cell_margins(c1, 80, 80, 120, 120)
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = primary_color
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = text_color

    doc.add_page_break()
    
    # Helper for headings
    def add_sec_heading(title, num):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(18)
        h.paragraph_format.space_after = Pt(6)
        r = h.add_run(f"{num}. {title}")
        r.font.size = Pt(16)
        r.font.bold = True
        r.font.color.rgb = accent_color
        return h

    def add_sub_heading(title):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(12)
        h.paragraph_format.space_after = Pt(4)
        r = h.add_run(title)
        r.font.size = Pt(12.5)
        r.font.bold = True
        r.font.color.rgb = primary_color
        return h

    def add_para(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.15
        r = p.add_run(text)
        r.font.size = Pt(10)
        r.font.color.rgb = text_color
        return p

    def add_bullet(bold_prefix, text):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        r_bold = p.add_run(bold_prefix)
        r_bold.font.bold = True
        r_bold.font.size = Pt(10)
        r_bold.font.color.rgb = primary_color
        r_text = p.add_run(text)
        r_text.font.size = Pt(10)
        r_text.font.color.rgb = text_color
        return p

    # ── 1. PROJECT TITLE ───────────────────────────────────────────
    add_sec_heading("Project Title", 1)
    add_para("PALMYRA — An Ultra-Responsive, Cloud-Native Online Auction and Multi-Vendor Marketplace Platform built with SvelteKit 2, Svelte 5 Runes, Tailwind CSS v4, and Supabase Backend Infrastructure.")

    # ── 2. INTRODUCTION ────────────────────────────────────────────
    add_sec_heading("Introduction", 2)
    add_para("In contemporary e-commerce, conventional classifieds and fixed-price marketplaces lack dynamic price discovery, whereas legacy auction systems suffer from cumbersome user experiences, slow page reloads, and inconsistent visual presentation across devices.")
    add_para("PALMYRA is conceived and engineered as a high-performance, mobile-first auction and marketplace web platform. Built upon the latest reactive paradigms of Svelte 5 and SvelteKit 2, PALMYRA integrates tightly with Supabase BaaS (PostgreSQL, Auth with SSR Cookies, and Object Storage).")
    add_para("The system bridges the gap between buyers looking for competitive deals and sellers seeking an effortless listing flow. Through an innovative in-browser 4:3 canvas cropping engine, client-side WebP compression, cascading taxonomies, and instant server-side rendered queries, PALMYRA delivers enterprise-grade fluidity with zero layout shift and minimal network overhead.")

    # ── 3. OBJECTIVES ──────────────────────────────────────────────
    add_sec_heading("Objectives", 3)
    add_bullet("1. Real-Time Dynamic Marketplace: ", "Deliver an authentic auction mechanism featuring starting bids, reserve prices, Buy-It-Now instant checkouts, and dynamic countdown timers.")
    add_bullet("2. Frictionless Seller Workflow ('Start Selling'): ", "Provide an intuitive multi-step listing interface accessible in seconds, complete with authentication state preservation, cascading categories, and tag indexing.")
    add_bullet("3. Enforced Canonical 4:3 Media Pipeline: ", "Eliminate image distortions, letterboxing, and layout jumping by mandating a strict 4:3 aspect ratio across all touchpoints (thumbnails, gallery cards, and hero views) via client-side canvas manipulation.")
    add_bullet("4. Performance & Mobile-First Usability: ", "Ensure strict adherence to mobile usability guidelines including touch targets >= 44px, sticky bid bars, lazy image loading, zero horizontal scrolling, and responsiveness down to 360px viewport widths.")
    add_bullet("5. Zero-Trust Security & Row Level Security (RLS): ", "Enforce strict Postgres RLS policies preventing unauthorized listing mutations, isolating storage buckets, and validating sessions via server-side HTTP-only cookies.")
    add_bullet("6. Clean Architecture & Extensibility: ", "Utilize type-safe TypeScript models, Svelte 5 Runes ($state, $derived, $effect), and Tailwind CSS v4 utility classes to ensure maintainability.")

    # ── 4. MODULES ─────────────────────────────────────────────────
    add_sec_heading("Modules Overview", 4)
    add_para("The PALMYRA architecture is structured into seven distinct, highly cohesive functional modules:")
    add_bullet("1. Authentication & Session Module: ", "Handles sign-in, registration, password recovery, and OAuth via Supabase Auth with SSR cookies and return-URL navigation guards.")
    add_bullet("2. Seller & Listing Creation Module: ", "Enables item publication with cascading taxonomy selectors, condition grading, pricing parameters, camera integration, and canvas cropper.")
    add_bullet("3. Media Pipeline & Storage Module: ", "Manages camera capture, multi-image queueing, client-side 4:3 cropping, WebP compression, Supabase Storage uploads, and display reordering.")
    add_bullet("4. Live Marketplace & Discovery Module: ", "Powers the homepage featured feeds, real-time search, sorting (price, recent, ending soon), and pagination.")
    add_bullet("5. Listing Details & Gallery Showcase: ", "Renders comprehensive item data, interactive 4:3 image carousel, active countdown clock, views counter, and seller verification.")
    add_bullet("6. Bidding & Watchlist Engine: ", "Facilitates bid placement validation, Buy-It-Now purchases, and item watchlisting.")
    add_bullet("7. User Profile & Reputation Module: ", "Provides seller profiles, avatar management, review aggregation, and star rating calculations.")

    # ── 5. TECHNOLOGIES USED ───────────────────────────────────────
    add_sec_heading("Technologies Used", 5)
    
    tech_table = doc.add_table(rows=7, cols=3)
    tech_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Layer", "Technology / Library", "Role & Justification"]
    for j, h_text in enumerate(headers):
        cell = tech_table.rows[0].cells[j]
        set_cell_background(cell, "1E293B")
        set_cell_margins(cell, 100, 100, 120, 120)
        p = cell.paragraphs[0]
        r = p.add_run(h_text)
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(255, 255, 255)
        
    tech_rows = [
        ("Frontend Framework", "SvelteKit 2 + Svelte 5", "Modern reactive UI using Svelte 5 Runes ($state, $derived, $effect). Server-Side Rendering (SSR) for instant SEO-friendly loads and zero client hydration lag."),
        ("Language", "TypeScript 6.0", "End-to-end static typing across routes, server actions, database entities, and client components."),
        ("Styling & UI", "Tailwind CSS v4 + Lucide", "Next-gen CSS-first compiler for micro-sized bundles, frosted-glass aesthetics, dark mode toggling, and accessible icons."),
        ("Database & RLS", "PostgreSQL (Supabase)", "Relational persistence with UUID primary keys, foreign key constraints, cascading deletes, and Row-Level Security (RLS) policies."),
        ("Auth & Session", "Supabase Auth + SSR Cookies", "JWT token handling with exchangeCodeForSession, server hooks session validation, and OAuth Google authentication."),
        ("Object Storage", "Supabase Storage (CDN)", "Scalable public bucket 'listing-images' with fine-grained authenticated upload policies and public CDN distribution.")
    ]
    for i, row_data in enumerate(tech_rows, start=1):
        for j, val in enumerate(row_data):
            cell = tech_table.rows[i].cells[j]
            bg = "F8FAFC" if i % 2 == 1 else "FFFFFF"
            set_cell_background(cell, bg)
            set_cell_margins(cell, 80, 80, 100, 100)
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(9)
            r.font.color.rgb = text_color
            if j == 0:
                r.font.bold = True
                
    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # ── 6. DATA FLOW DIAGRAMS (DFD) ────────────────────────────────
    add_sec_heading("Data Flow Diagrams (DFD)", 6)
    add_sub_heading("6.1 DFD Level 0 (Context Diagram)")
    add_para("The Context Diagram illustrates the global interaction boundary between external actors (Buyer, Seller, Administrator, OAuth Provider) and the PALMYRA system.")
    
    # Textual diagram representation
    dfd0_box = doc.add_table(rows=1, cols=1)
    dfd0_cell = dfd0_box.rows[0].cells[0]
    set_cell_background(dfd0_cell, "F1F5F9")
    set_cell_margins(dfd0_cell, 120, 120, 150, 150)
    p = dfd0_cell.paragraphs[0]
    p.paragraph_format.line_spacing = 1.05
    p.add_run("""
+-----------------------------------------------------------------------------------------+
|                                    DFD LEVEL 0: CONTEXT DIAGRAM                         |
+-----------------------------------------------------------------------------------------+

          [ SELLER ]                                                   [ BUYER ]
              |                                                            |
              | 1. Credentials / Profile                                   | 1. Credentials / Search query
              | 2. Listing Details + Cropped 4:3 Images                    | 2. Bid Placement / Buy-Now
              | 3. Manage Listings / Schedule                              | 3. Add to Watchlist / Review
              v                                                            v
       +--------------------------------------------------------------------------+
       |                                                                          |
       |                   PALMYRA ONLINE AUCTION PLATFORM                        |
       |                                                                          |
       +--------------------------------------------------------------------------+
              ^                                                            ^
              | Token exchange / Redirect                                  | Static assets / CDN URLs
              v                                                            v
      [ GOOGLE OAUTH ]                                           [ SUPABASE STORAGE ]
      (Identity Provider)                                        (listing-images bucket)
""").font.name = "Courier New"
    p.runs[0].font.size = Pt(8.5)

    add_sub_heading("6.2 DFD Level 1 (Decomposition Diagram)")
    add_para("The Level 1 DFD decomposes PALMYRA into its core functional subsystems and their corresponding database entities:")
    add_bullet("Process 1.0: User Authentication: ", "Validates credentials against auth.users, creates session cookies, and provisions profiles row.")
    add_bullet("Process 2.0: Listing Publication: ", "Receives multi-part form data, computes URL-friendly slugs, inserts into 'listings', 'listing_tags'.")
    add_bullet("Process 3.0: Media Processing: ", "Canvas crops image to 4:3, encodes to WebP, streams to 'listing-images' bucket, inserts records into 'listing_images'.")
    add_bullet("Process 4.0: Search & Discovery Engine: ", "Filters 'listings' by active timestamp, subcategory, keyword, and sort criteria; hydrates primary images and seller ratings.")
    add_bullet("Process 5.0: Auction & Bidding Engine: ", "Validates bid increments, logs transactions into 'bids' and 'bid_history', updates current_price.")

    add_sub_heading("6.3 DFD Level 2 (Seller Creation Flow)")
    add_para("Detailed sub-process flow of the Seller Module:")
    add_bullet("Step 2.1: ", "Client selects or captures photo via Camera API.")
    add_bullet("Step 2.2: ", "ImageCropper renders interactive HTML5 Canvas enforcing 4:3 constraint.")
    add_bullet("Step 2.3: ", "Offscreen canvas renders 800x600 WebP blob at 85% compression quality.")
    add_bullet("Step 2.4: ", "ImageUploader concurrently streams blobs to Supabase Storage `{user_id}/{listing_id}/{uuid}.webp`.")
    add_bullet("Step 2.5: ", "Form submission triggers server action: transaction writes to `listings`, `listing_images`, and `listing_tags`.")
    add_bullet("Step 2.6: ", "User redirected to `/listings/{slug}` detail view.")

    # ── 7. ENTITY-RELATIONSHIP (ER) DIAGRAM ────────────────────────
    add_sec_heading("Entity-Relationship (ER) Diagram", 7)
    add_para("The database architecture is built around relational integrity, normalized foreign keys, and referential actions. The schema diagram and cardinalities are outlined below:")
    
    er_box = doc.add_table(rows=1, cols=1)
    er_cell = er_box.rows[0].cells[0]
    set_cell_background(er_cell, "F1F5F9")
    set_cell_margins(er_cell, 120, 120, 150, 150)
    p = er_cell.paragraphs[0]
    p.paragraph_format.line_spacing = 1.05
    p.add_run("""
+-----------------------------------------------------------------------------------------+
|                                  ENTITY-RELATIONSHIP DIAGRAM                            |
+-----------------------------------------------------------------------------------------+

  [auth.users] 1 -------- 1 [profiles]
                                | 1
                                |
                                | has many
                                v *
  [categories] 1 --- * [subcategories] 1 --- * [listings] 1 --- * [listing_images]
                                                    |  |
                                                    |  +------- * [listing_tags]
                                                    |
                                                    +---------- * [watchlist] * --- 1 [profiles]
                                                    |
                                                    +---------- * [bids] 1 --- * [bid_history]
                                                    |              |
                                                    |              v
                                                    |        [profiles] (bidder)
                                                    |
                                                    +---------- * [reviews] * --- 1 [profiles]
""").font.name = "Courier New"
    p.runs[0].font.size = Pt(8.5)

    add_sub_heading("7.1 Cardinality & Relationship Matrix")
    add_bullet("profiles (1) to listings (*): ", "One seller can create zero or many listings. Each listing belongs to exactly one seller.")
    add_bullet("categories (1) to subcategories (*): ", "One primary category encompasses multiple subcategories.")
    add_bullet("subcategories (1) to listings (*): ", "A subcategory classifies multiple listings.")
    add_bullet("listings (1) to listing_images (*): ", "One listing possesses multiple images (order indexed, 1 primary). Cascade on delete.")
    add_bullet("listings (1) to listing_tags (*): ", "One listing has multiple tag keywords. Cascade on delete.")
    add_bullet("listings (1) to bids (*): ", "An active auction listing accumulates multiple bids placed by distinct bidders.")
    add_bullet("bids (1) to bid_history (*): ", "Each bid triggers an audit log entry in bid_history tracking price progression.")
    add_bullet("profiles (1) to watchlist (*): ", "A user can watchlist multiple listings; a listing can be on multiple users' watchlists.")

    # ── 8. DATABASE DESIGN ─────────────────────────────────────────
    add_sec_heading("Database Design & Schema Specification", 8)
    add_para("The relational PostgreSQL database in Supabase comprises the following tables, constraints, and data dictionaries:")
    
    def add_schema_table(table_name, columns):
        add_sub_heading(f"Table: {table_name}")
        t = doc.add_table(rows=len(columns)+1, cols=4)
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        headers = ["Column", "Type", "Constraints", "Description"]
        for j, h in enumerate(headers):
            c = t.rows[0].cells[j]
            set_cell_background(c, "334155")
            set_cell_margins(c, 70, 70, 90, 90)
            p = c.paragraphs[0]
            r = p.add_run(h)
            r.font.bold = True
            r.font.size = Pt(8.5)
            r.font.color.rgb = RGBColor(255, 255, 255)
        for i, (col, typ, con, desc) in enumerate(columns, start=1):
            bg = "F8FAFC" if i % 2 == 1 else "FFFFFF"
            for j, val in enumerate([col, typ, con, desc]):
                c = t.rows[i].cells[j]
                set_cell_background(c, bg)
                set_cell_margins(c, 50, 50, 70, 70)
                p = c.paragraphs[0]
                r = p.add_run(val)
                r.font.size = Pt(8.5)
                r.font.color.rgb = text_color
                if j == 0:
                    r.font.bold = True
        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    add_schema_table("listings", [
        ("id", "uuid", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Unique listing identifier"),
        ("seller_id", "uuid", "FOREIGN KEY -> profiles(id) ON DELETE CASCADE", "Identifier of the seller profile"),
        ("subcategory_id", "uuid", "FOREIGN KEY -> subcategories(id)", "Category taxonomy linkage"),
        ("title", "text", "NOT NULL", "Listing title headline (max 120 chars)"),
        ("slug", "text", "NOT NULL, UNIQUE", "SEO URL-slug (title-prefix + 6-char hash)"),
        ("description", "text", "NOT NULL", "Full markdown/plain item description"),
        ("condition", "text", "NOT NULL", "Enum: brand_new, like_new, open_box, etc."),
        ("starting_price", "numeric", "NOT NULL, CHECK (starting_price > 0)", "Initial minimum opening bid in INR"),
        ("current_price", "numeric", "NOT NULL", "Current highest bid or starting price"),
        ("buy_it_now_price", "numeric", "NULLABLE, CHECK (> starting_price)", "Instant purchase price buyout"),
        ("reserve_price", "numeric", "NULLABLE", "Hidden minimum price required to win"),
        ("quantity", "int4", "DEFAULT 1, CHECK (quantity >= 1)", "Available lot inventory count"),
        ("status", "text", "DEFAULT 'active'", "Enum: draft, active, ended, sold, cancelled"),
        ("start_date", "timestamptz", "NOT NULL", "Scheduled auction opening timestamp"),
        ("end_date", "timestamptz", "NOT NULL", "Auction closing deadline"),
        ("views", "int4", "DEFAULT 0", "Accumulated listing view count"),
        ("created_at", "timestamptz", "DEFAULT now()", "Creation timestamp"),
        ("updated_at", "timestamptz", "DEFAULT now()", "Last modified timestamp")
    ])

    add_schema_table("listing_images", [
        ("id", "uuid", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Unique image record ID"),
        ("listing_id", "uuid", "FOREIGN KEY -> listings(id) ON DELETE CASCADE", "Associated listing ID"),
        ("image_url", "text", "NOT NULL", "Public CDN URL from listing-images bucket"),
        ("is_primary", "bool", "DEFAULT false", "Flag for primary card/hero showcase"),
        ("display_order", "int4", "DEFAULT 0", "Ordering sequence index"),
        ("created_at", "timestamptz", "DEFAULT now()", "Timestamp of upload")
    ])

    add_schema_table("profiles", [
        ("id", "uuid", "PRIMARY KEY -> auth.users(id) ON DELETE CASCADE", "Auth user link"),
        ("username", "text", "NOT NULL, UNIQUE", "Unique display handle"),
        ("full_name", "text", "NULLABLE", "Legal or store display name"),
        ("avatar_id", "text", "NULLABLE", "Storage object path in profile_pictures"),
        ("bio", "text", "NULLABLE", "Seller biographical summary"),
        ("rating", "numeric", "DEFAULT 0.0", "Aggregated star score (0.0 to 5.0)"),
        ("total_reviews", "int4", "DEFAULT 0", "Total customer reviews received"),
        ("created_at", "timestamptz", "DEFAULT now()", "Profile creation timestamp")
    ])

    add_schema_table("categories & subcategories", [
        ("categories.id", "uuid", "PRIMARY KEY", "Category ID"),
        ("categories.name", "text", "NOT NULL", "Display name (e.g. Electronics)"),
        ("categories.slug", "text", "NOT NULL, UNIQUE", "URL identifier (e.g. electronics)"),
        ("subcategories.id", "uuid", "PRIMARY KEY", "Subcategory ID"),
        ("subcategories.category_id", "uuid", "FOREIGN KEY -> categories(id)", "Parent category relation"),
        ("subcategories.name", "text", "NOT NULL", "Subcategory display name"),
        ("subcategories.slug", "text", "NOT NULL", "URL identifier")
    ])

    # ── 9. FUNCTIONALITIES OF EACH MODULE ──────────────────────────
    add_sec_heading("Functionalities of Each Module", 9)
    
    add_sub_heading("9.1 Authentication & Routing Guard Module")
    add_bullet("Session Interception: ", "Server hooks validate every incoming request against Supabase Auth cookies using `@supabase/ssr`.")
    add_bullet("Return-URL Preservation: ", "Unauthenticated clicks on 'Start Selling' redirect to `/auth/signin?next=/sell`. Upon successful login (email or OAuth), the user returns to `/sell` automatically.")
    add_bullet("Security Handshake: ", "Implements PKCE OAuth code exchange at `/auth/callback` to securely provision browser session cookies.")

    add_sub_heading("9.2 Seller Listing Creation Module ('Start Selling')")
    add_bullet("Multi-Step Wizard: ", "Divides submission into Step 1 (Photos), Step 2 (Item Details), and Step 3 (Pricing & Schedule) for cognitive ease on mobile.")
    add_bullet("Cascading Taxonomy: ", "Selecting a parent category dynamically filters subcategories in real time without page reload.")
    add_bullet("Automated Slug Generation: ", "Converts title to hyphenated alphanumeric text appended with a random nanoid ensuring URL uniqueness.")
    add_bullet("Multi-Field Validation: ", "Checks minimum title length, descriptions, valid date ranges (end > start), and positive prices.")

    add_sub_heading("9.3 Canonical 4:3 Image Processing Pipeline")
    add_bullet("Multi-Source Intake: ", "Supports both direct mobile camera capture (`capture='environment'`) and multi-file desktop selection.")
    add_bullet("In-Browser Canvas Cropper: ", "Forces a strict 4:3 ratio with pan, zoom (1x to 5x), and rule-of-thirds alignment overlay.")
    add_bullet("Client-Side WebP Compression: ", "Encodes cropped canvases into 800x600 WebP images at 85% quality, reducing typical file size by 75-85%.")
    add_bullet("Parallel Uploads & Reordering: ", "Streams images directly to Supabase Storage with per-image progress indicators, retry handlers, primary image selection, and drag-and-drop reordering.")

    add_sub_heading("9.4 Marketplace Discovery & Live Listings Module")
    add_bullet("Real-Time Database Feed: ", "Replaces mock data with live SQL queries filtering `status='active'` and `now() BETWEEN start_date AND end_date`.")
    add_bullet("Search & Multi-Sort: ", "Allows filtering by text search (`ilike '%query%'`) and sorting by newest, ending soon, price low-to-high, and price high-to-low.")
    add_bullet("Consistent 4:3 Rendering: ", "ProductCard components enforce `aspect-[4/3] object-cover` preventing letterboxing and layout shifts.")

    add_sub_heading("9.5 Detail Page & Sticky Mobile Action Bar")
    add_bullet("Gallery Showcase: ", "Renders primary 4:3 hero preview with thumbnail quick-selector.")
    add_bullet("Live Countdown Timer: ", "Calculates remaining days, hours, and minutes; highlights urgent listings with red indicators under 24 hours.")
    add_bullet("Mobile Sticky Bid Bar: ", "Fixed bottom bar on viewports < 1024px ensuring 1-tap bid and Buy-It-Now actions without scrolling.")
    add_bullet("View Count Incrementor: ", "Fire-and-forget asynchronous view counter on page loads.")

    # ── 10. FUTURE SCOPE ───────────────────────────────────────────
    add_sec_heading("Future Scope & Enhancements", 10)
    add_bullet("1. WebSocket Real-Time Bidding: ", "Implement Supabase Realtime Postgres CDC channels to broadcast new bids instantaneously across all connected clients without polling.")
    add_bullet("2. Automated Escrow & Payment Gateways: ", "Integrate Stripe Connect or Razorpay webhooks to hold winning bid amounts in escrow until buyer marks delivery received.")
    add_bullet("3. AI-Assisted Image Inspection: ", "Deploy an Edge Function utilizing computer vision to evaluate listing photo condition against declared grading and flag counterfeits.")
    add_bullet("4. Push Notifications & SMS Alerts: ", "Deliver instant Web Push and SMS notifications when a user is outbid or an auction is 15 minutes from closing.")
    add_bullet("5. Automated Auction Closer (pg_cron): ", "Schedule server-side Postgres cron tasks to automatically mark expired listings as 'sold' or 'ended' and generate settlement invoices.")

    # ── 11. EXECUTION OF THE PROJECT ───────────────────────────────
    add_sec_heading("Execution of the Project", 11)
    add_sub_heading("11.1 Prerequisites")
    add_bullet("Runtime: ", "Node.js (v20.x or higher) and pnpm (v9+ or v10+).")
    add_bullet("Cloud Backend: ", "Supabase account with a new or existing project.")

    add_sub_heading("11.2 Environment Configuration")
    add_para("Create a `.env.local` file in the root workspace directory:")
    env_box = doc.add_table(rows=1, cols=1)
    env_cell = env_box.rows[0].cells[0]
    set_cell_background(env_cell, "F1F5F9")
    set_cell_margins(env_cell, 80, 80, 100, 100)
    p = env_cell.paragraphs[0]
    p.add_run("""PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co\nPUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>""").font.name = "Courier New"
    p.runs[0].font.size = Pt(9)

    add_sub_heading("11.3 Database & Storage Setup")
    add_bullet("Step 1: ", "Navigate to the Supabase SQL Editor and execute all SQL commands from `docs/supabase-setup.sql`.")
    add_bullet("Step 2: ", "In Supabase Dashboard -> Storage, ensure the bucket `listing-images` exists and is marked 'Public'.")
    add_bullet("Step 3: ", "Apply the storage RLS policies enabling authenticated INSERTs and public SELECTs.")

    add_sub_heading("11.4 Running the Application Locally")
    run_box = doc.add_table(rows=1, cols=1)
    run_cell = run_box.rows[0].cells[0]
    set_cell_background(run_cell, "F1F5F9")
    set_cell_margins(run_cell, 80, 80, 100, 100)
    p = run_cell.paragraphs[0]
    p.add_run("""# 1. Install dependencies
pnpm install

# 2. Synchronize SvelteKit types
pnpm prepare

# 3. Launch Vite development server
pnpm dev

# The app is accessible at http://localhost:5173""").font.name = "Courier New"
    p.runs[0].font.size = Pt(9)

    add_sub_heading("11.5 Building for Production")
    build_box = doc.add_table(rows=1, cols=1)
    build_cell = build_box.rows[0].cells[0]
    set_cell_background(build_cell, "F1F5F9")
    set_cell_margins(build_cell, 80, 80, 100, 100)
    p = build_cell.paragraphs[0]
    p.add_run("""# Type check codebase
pnpm check

# Build optimized production bundle
pnpm build

# Preview production build locally
pnpm preview""").font.name = "Courier New"
    p.runs[0].font.size = Pt(9)

    doc.save(DOCX_PATH)
    print(f"DOCX created: {DOCX_PATH}")

def build_html():
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>PALMYRA — Project Documentation</title>
<style>
  @page {
    size: A4;
    margin: 20mm 18mm 20mm 18mm;
    @bottom-center {
      content: counter(page);
      font-size: 9pt;
      color: #64748b;
    }
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1e293b;
    line-height: 1.55;
    font-size: 10pt;
    margin: 0;
    padding: 0;
  }
  .cover {
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    text-align: center;
    padding-top: 40px;
  }
  .cover-pre {
    color: #4f46e5;
    font-weight: 700;
    font-size: 11pt;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 12px;
  }
  .cover-title {
    font-size: 28pt;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 10px 0;
    letter-spacing: -0.5px;
  }
  .cover-sub {
    font-size: 13pt;
    color: #475569;
    max-width: 600px;
    margin: 0 0 40px 0;
  }
  .cover-meta {
    width: 100%;
    max-width: 550px;
    border-collapse: collapse;
    margin-top: 30px;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .cover-meta td {
    padding: 10px 14px;
    font-size: 9.5pt;
    border-bottom: 1px solid #e2e8f0;
  }
  .cover-meta td.label {
    background: #f1f5f9;
    font-weight: 600;
    color: #334155;
    width: 38%;
  }
  .cover-meta td.val {
    background: #f8fafc;
    color: #1e293b;
  }
  h1 {
    font-size: 17pt;
    color: #4f46e5;
    border-bottom: 2px solid #e0e7ff;
    padding-bottom: 6px;
    margin-top: 32px;
    margin-bottom: 14px;
    page-break-after: avoid;
  }
  h2 {
    font-size: 12.5pt;
    color: #0f172a;
    margin-top: 22px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }
  p {
    margin: 0 0 10px 0;
    text-align: justify;
  }
  ul {
    margin: 0 0 14px 20px;
    padding: 0;
  }
  li {
    margin-bottom: 6px;
  }
  li strong {
    color: #0f172a;
  }
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 18px 0;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }
  table.data-table th {
    background: #1e293b;
    color: #ffffff;
    font-weight: 600;
    padding: 8px 10px;
    text-align: left;
    border: 1px solid #1e293b;
  }
  table.data-table td {
    padding: 7px 10px;
    border: 1px solid #cbd5e1;
    color: #334155;
  }
  table.data-table tr:nth-child(even) td {
    background: #f8fafc;
  }
  .diagram-box {
    background: #0f172a;
    color: #38bdf8;
    padding: 14px 18px;
    border-radius: 8px;
    font-family: "Courier New", Courier, monospace;
    font-size: 8pt;
    line-height: 1.35;
    overflow-x: auto;
    margin: 14px 0 20px 0;
    page-break-inside: avoid;
  }
  .code-block {
    background: #f1f5f9;
    border-left: 4px solid #4f46e5;
    padding: 10px 14px;
    font-family: "Courier New", Courier, monospace;
    font-size: 8.5pt;
    margin: 10px 0 14px 0;
    color: #1e293b;
    border-radius: 0 6px 6px 0;
  }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    font-size: 7.5pt;
    font-weight: 700;
    border-radius: 9999px;
    background: #e0e7ff;
    color: #4338ca;
  }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-pre">Software Engineering Project Specification</div>
  <div class="cover-title">PALMYRA</div>
  <div class="cover-sub">Modern Full-Stack Online Auction & Marketplace Platform</div>
  
  <table class="cover-meta">
    <tr>
      <td class="label">Project Title</td>
      <td class="val">PALMYRA — Online Auction & Marketplace</td>
    </tr>
    <tr>
      <td class="label">System Architecture</td>
      <td class="val">SvelteKit 2 + Svelte 5 + Supabase BaaS (PostgreSQL, Auth, Storage)</td>
    </tr>
    <tr>
      <td class="label">Primary Innovation</td>
      <td class="val">Canonical 4:3 Aspect Ratio Pipeline with In-Browser Canvas Cropper</td>
    </tr>
    <tr>
      <td class="label">Branch & Environment</td>
      <td class="val"><code>sellerproduction</code> | Production Ready</td>
    </tr>
    <tr>
      <td class="label">Release Date</td>
      <td class="val">November 2026</td>
    </tr>
  </table>
</div>

<!-- SECTION 1 -->
<h1>1. Project Title</h1>
<p><strong>PALMYRA</strong> — An Ultra-Responsive, Cloud-Native Online Auction and Multi-Vendor Marketplace Platform built with SvelteKit 2, Svelte 5 Runes, Tailwind CSS v4, and Supabase Backend-as-a-Service.</p>

<!-- SECTION 2 -->
<h1>2. Introduction</h1>
<p>Modern e-commerce requires dynamic, fair pricing mechanisms alongside rapid visual engagement. Conventional classifieds and fixed-price marketplaces lack dynamic price discovery, whereas legacy auction systems suffer from clunky user interfaces, full-page reloads, distorted images, and poor mobile accessibility.</p>
<p><strong>PALMYRA</strong> resolves these deficiencies through a modern, cloud-native architecture combining SvelteKit 2 (with Svelte 5's new reactivity runes) on the frontend and Supabase (PostgreSQL 15, Auth with SSR cookies, and Storage CDN) on the backend.</p>
<p>A flagship engineering highlight of PALMYRA is its <strong>Zero-Distortion Media Pipeline</strong>: by enforcing a canonical <strong>4:3 aspect ratio</strong> across every touchpoint (thumbnails, gallery cards, and hero viewports) via an interactive client-side canvas cropper and WebP compressor, the platform guarantees zero cumulative layout shifts (CLS) and snappy mobile performance.</p>

<!-- SECTION 3 -->
<h1>3. Objectives</h1>
<ul>
  <li><strong>Real-Time Dynamic Marketplace:</strong> Implement competitive live auctions featuring starting bids, Buy-It-Now instant checkouts, reserve thresholds, and dynamic countdown timers.</li>
  <li><strong>Streamlined "Start Selling" Flow:</strong> Facilitate rapid listing creation with return-URL preservation across authentication boundaries, cascading categories, and tag indexing.</li>
  <li><strong>Standardized 4:3 Media Uniformity:</strong> Eradicate image stretching, letterboxing, and layout jumping by constraining all uploads to 4:3 via an interactive canvas cropper.</li>
  <li><strong>Mobile-First Ergonomics:</strong> Guarantee touch targets &ge; 44px, sticky bid bars on mobile viewports, zero horizontal overflow, and responsiveness down to 360px widths.</li>
  <li><strong>Zero-Trust Security & Row Level Security:</strong> Implement PostgreSQL RLS policies that isolate user data, restrict mutations to owners, and enforce cookie session validation.</li>
</ul>

<!-- SECTION 4 -->
<h1>4. Modules Overview</h1>
<ul>
  <li><strong>Authentication & Routing Guard Module:</strong> Manages session cookies, OAuth code exchanges, protected route barriers, and return-URL navigation.</li>
  <li><strong>Seller & Listing Creation Module:</strong> Powers a multi-step listing wizard with cascading category taxonomy, condition grading, price rules, and slug generation.</li>
  <li><strong>Media Pipeline & Storage Module:</strong> Direct camera capture, multi-image upload queue, interactive 4:3 canvas cropper, WebP compression, reordering, and Supabase Storage CDN distribution.</li>
  <li><strong>Marketplace Discovery & Live Feeds:</strong> Live PostgreSQL queries for active auctions, multi-parameter search, category filtering, sorting, and pagination.</li>
  <li><strong>Listing Details & Showcase:</strong> 4:3 gallery view with thumbnail carousel, live countdown, view count incrementor, and verified seller info.</li>
  <li><strong>Auction Bidding & Watchlist:</strong> Bid placement validation, Buy-It-Now execution, and user watchlisting.</li>
  <li><strong>User Profile & Reputation:</strong> Seller profiles, review score calculation, avatar management, and ratings.</li>
</ul>

<!-- SECTION 5 -->
<h1>5. Technologies Used</h1>
<table class="data-table">
  <thead>
    <tr>
      <th style="width: 25%;">Layer</th>
      <th style="width: 30%;">Technology</th>
      <th style="width: 45%;">Role & Significance</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Frontend Framework</strong></td>
      <td>SvelteKit 2 + Svelte 5</td>
      <td>Runes reactivity (<code>$state</code>, <code>$derived</code>, <code>$effect</code>). Hybrid SSR/CSR ensures instant first-contentful paint with minimal client JavaScript.</td>
    </tr>
    <tr>
      <td><strong>Type System</strong></td>
      <td>TypeScript 6.0</td>
      <td>Full-stack end-to-end type safety for database models, API responses, form actions, and component props.</td>
    </tr>
    <tr>
      <td><strong>Styling & Icons</strong></td>
      <td>Tailwind CSS v4 + Lucide</td>
      <td>Next-generation CSS engine with frosted glass aesthetic, dark/light theme switching, and accessible SVG iconography.</td>
    </tr>
    <tr>
      <td><strong>Database & Engine</strong></td>
      <td>PostgreSQL 15 (Supabase)</td>
      <td>Relational integrity, foreign key cascades, check constraints, UUID primary keys, and PL/pgSQL triggers.</td>
    </tr>
    <tr>
      <td><strong>Security & Auth</strong></td>
      <td>Supabase Auth + SSR Cookies</td>
      <td>Server-side session validation via HTTP-only cookies, OAuth (Google), and Row-Level Security (RLS) enforcement.</td>
    </tr>
    <tr>
      <td><strong>Cloud Storage</strong></td>
      <td>Supabase Storage (CDN)</td>
      <td>Public bucket <code>listing-images</code> with authenticated uploads and public CDN delivery.</td>
    </tr>
  </tbody>
</table>

<!-- SECTION 6 -->
<h1>6. Data Flow Diagrams (DFD)</h1>
<h2>6.1 DFD Level 0 — Context Diagram</h2>
<div class="diagram-box">
+-----------------------------------------------------------------------------------------+
|                                    DFD LEVEL 0: CONTEXT DIAGRAM                         |
+-----------------------------------------------------------------------------------------+

          [ SELLER ]                                                   [ BUYER ]
              |                                                            |
              | 1. Credentials / Profile                                   | 1. Search & Filter Listings
              | 2. Item Details + Cropped 4:3 Images                      | 2. Place Bid / Buy-Now
              | 3. Manage Inventory & Schedule                            | 3. Add to Watchlist / Review
              v                                                            v
       +--------------------------------------------------------------------------+
       |                                                                          |
       |                   PALMYRA ONLINE AUCTION PLATFORM                        |
       |                                                                          |
       +--------------------------------------------------------------------------+
              ^                                                            ^
              | OAuth Redirect & Token                                     | Public 4:3 WebP URLs
              v                                                            v
      [ GOOGLE OAUTH ]                                           [ SUPABASE STORAGE ]
      (Identity Provider)                                        (listing-images bucket)
</div>

<h2>6.2 DFD Level 1 — Subsystem Decomposition</h2>
<div class="diagram-box">
+-----------------------------------------------------------------------------------------+
|                                   DFD LEVEL 1: SUBSYSTEM DIAGRAM                        |
+-----------------------------------------------------------------------------------------+

  [User] ---> (1.0 Auth & Session) <---> [auth.users] / [profiles]
                    |
                    v (Authenticated Context)
  [Seller] -> (2.0 Listing Publication) ----> [listings] & [listing_tags]
                    |
                    +-> (3.0 Media Cropper & Upload) -> [Supabase Storage]
                                                              |
                                                              v (image_url)
                                                    [listing_images]
                    
  [Buyer] --> (4.0 Browse & Search) <------ [listings] + [listing_images]
                    |
                    +-> (5.0 Bidding Engine) -------> [bids] & [bid_history]
                    |
                    +-> (6.0 Watchlist Manager) ----> [watchlist]
</div>

<h2>6.3 DFD Level 2 — Seller Listing Creation & Media Flow</h2>
<ul>
  <li><strong>2.1 Camera / File Picker:</strong> User triggers file selector or native mobile camera (<code>capture="environment"</code>).</li>
  <li><strong>2.2 Interactive 4:3 Canvas Cropper:</strong> Image loaded into HTML5 Canvas; user zooms (1x-5x) and pans.</li>
  <li><strong>2.3 Offscreen WebP Export:</strong> Canvas outputs 800x600 WebP blob at 0.85 compression quality.</li>
  <li><strong>2.4 Concurrent Storage Streaming:</strong> Blobs streamed in parallel to <code>listing-images/{uid}/{listing_id}/{uuid}.webp</code>.</li>
  <li><strong>2.5 Server Transaction:</strong> POST action writes atomically to <code>listings</code>, <code>listing_images</code>, and <code>listing_tags</code>.</li>
</ul>

<!-- SECTION 7 -->
<h1>7. Entity-Relationship (ER) Diagram</h1>
<div class="diagram-box">
+-----------------------------------------------------------------------------------------+
|                                  ENTITY-RELATIONSHIP DIAGRAM                            |
+-----------------------------------------------------------------------------------------+

  [auth.users] 1 -------- 1 [profiles]
                                | 1
                                |
                                | has many
                                v *
  [categories] 1 --- * [subcategories] 1 --- * [listings] 1 --- * [listing_images]
                                                    |  |
                                                    |  +------- * [listing_tags]
                                                    |
                                                    +---------- * [watchlist] * --- 1 [profiles]
                                                    |
                                                    +---------- * [bids] 1 --- * [bid_history]
                                                    |              |
                                                    |              v
                                                    |        [profiles] (bidder)
                                                    |
                                                    +---------- * [reviews] * --- 1 [profiles]
</div>

<h2>7.1 Cardinality & Integrity Rules</h2>
<ul>
  <li><code>profiles</code> (1) &rarr; <code>listings</code> (*): One seller creates multiple listings; deletion cascades.</li>
  <li><code>categories</code> (1) &rarr; <code>subcategories</code> (*): Taxonomy hierarchy; cascading foreign key.</li>
  <li><code>listings</code> (1) &rarr; <code>listing_images</code> (*): 1-to-many relationship with order index and primary flag.</li>
  <li><code>listings</code> (1) &rarr; <code>listing_tags</code> (*): 1-to-many tag index for search filtering.</li>
  <li><code>listings</code> (1) &rarr; <code>bids</code> (*): Auction bids placed by buyers; records audit trail in <code>bid_history</code>.</li>
</ul>

<!-- SECTION 8 -->
<h1>8. Database Design & Schema Specification</h1>

<h2>Table: listings</h2>
<table class="data-table">
  <thead>
    <tr>
      <th>Column</th><th>Type</th><th>Constraints</th><th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>id</code></td><td>uuid</td><td>PRIMARY KEY, gen_random_uuid()</td><td>Unique listing identifier</td></tr>
    <tr><td><code>seller_id</code></td><td>uuid</td><td>FK &rarr; profiles(id) ON DELETE CASCADE</td><td>Seller account ID</td></tr>
    <tr><td><code>subcategory_id</code></td><td>uuid</td><td>FK &rarr; subcategories(id)</td><td>Category taxonomy linkage</td></tr>
    <tr><td><code>title</code></td><td>text</td><td>NOT NULL</td><td>Listing headline (max 120 chars)</td></tr>
    <tr><td><code>slug</code></td><td>text</td><td>NOT NULL, UNIQUE</td><td>URL slug with unique random suffix</td></tr>
    <tr><td><code>description</code></td><td>text</td><td>NOT NULL</td><td>Markdown/text item details</td></tr>
    <tr><td><code>condition</code></td><td>text</td><td>NOT NULL</td><td>Enum: brand_new, like_new, open_box, etc.</td></tr>
    <tr><td><code>starting_price</code></td><td>numeric</td><td>NOT NULL, CHECK (&gt; 0)</td><td>Opening bid in INR (&ge; 1)</td></tr>
    <tr><td><code>current_price</code></td><td>numeric</td><td>NOT NULL</td><td>Current highest bid or opening price</td></tr>
    <tr><td><code>buy_it_now_price</code></td><td>numeric</td><td>NULLABLE</td><td>Instant buyout price</td></tr>
    <tr><td><code>reserve_price</code></td><td>numeric</td><td>NULLABLE</td><td>Minimum hidden reserve</td></tr>
    <tr><td><code>quantity</code></td><td>int4</td><td>DEFAULT 1, CHECK (&ge; 1)</td><td>Inventory lot count</td></tr>
    <tr><td><code>status</code></td><td>text</td><td>DEFAULT 'active'</td><td>Enum: active, ended, sold, cancelled</td></tr>
    <tr><td><code>start_date</code></td><td>timestamptz</td><td>NOT NULL</td><td>Auction start time</td></tr>
    <tr><td><code>end_date</code></td><td>timestamptz</td><td>NOT NULL</td><td>Auction closing deadline</td></tr>
    <tr><td><code>views</code></td><td>int4</td><td>DEFAULT 0</td><td>Accumulated page views</td></tr>
    <tr><td><code>created_at</code></td><td>timestamptz</td><td>DEFAULT now()</td><td>Creation timestamp</td></tr>
  </tbody>
</table>

<h2>Table: listing_images</h2>
<table class="data-table">
  <thead>
    <tr>
      <th>Column</th><th>Type</th><th>Constraints</th><th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>id</code></td><td>uuid</td><td>PRIMARY KEY</td><td>Unique image record ID</td></tr>
    <tr><td><code>listing_id</code></td><td>uuid</td><td>FK &rarr; listings(id) ON DELETE CASCADE</td><td>Associated listing</td></tr>
    <tr><td><code>image_url</code></td><td>text</td><td>NOT NULL</td><td>Public CDN URL (4:3 WebP)</td></tr>
    <tr><td><code>is_primary</code></td><td>bool</td><td>DEFAULT false</td><td>Flag for primary card/hero showcase</td></tr>
    <tr><td><code>display_order</code></td><td>int4</td><td>DEFAULT 0</td><td>Ordering sequence index</td></tr>
    <tr><td><code>created_at</code></td><td>timestamptz</td><td>DEFAULT now()</td><td>Upload timestamp</td></tr>
  </tbody>
</table>

<h2>Table: profiles</h2>
<table class="data-table">
  <thead>
    <tr>
      <th>Column</th><th>Type</th><th>Constraints</th><th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>id</code></td><td>uuid</td><td>PRIMARY KEY &rarr; auth.users(id)</td><td>Auth user account ID</td></tr>
    <tr><td><code>username</code></td><td>text</td><td>NOT NULL, UNIQUE</td><td>Display handle</td></tr>
    <tr><td><code>full_name</code></td><td>text</td><td>NULLABLE</td><td>Full user name</td></tr>
    <tr><td><code>avatar_id</code></td><td>text</td><td>NULLABLE</td><td>Avatar path in storage bucket</td></tr>
    <tr><td><code>bio</code></td><td>text</td><td>NULLABLE</td><td>Biography summary</td></tr>
    <tr><td><code>rating</code></td><td>numeric</td><td>DEFAULT 0.0</td><td>Aggregated rating score (0.0 - 5.0)</td></tr>
    <tr><td><code>total_reviews</code></td><td>int4</td><td>DEFAULT 0</td><td>Total review counter</td></tr>
  </tbody>
</table>

<!-- SECTION 9 -->
<h1>9. Functionalities of Each Module</h1>
<h2>9.1 Authentication & Navigation Guards</h2>
<p>Session tokens are managed using HTTP-only cookies verified on every request by <code>src/hooks.server.ts</code>. If an unauthenticated user clicks "Start Selling", the system routes them to <code>/auth/signin?next=/sell</code>, preserving their intended destination across both password-based and OAuth Google sign-ins.</p>

<h2>9.2 Seller & Listing Creation Wizard</h2>
<p>Located at <code>/sell</code>, this multi-step form guides sellers through:</p>
<ul>
  <li><strong>Step 1 (Photos):</strong> Multi-upload with native camera option, canvas cropping, and upload progress indicators.</li>
  <li><strong>Step 2 (Details):</strong> Item title, description, cascading category &rarr; subcategory selector, condition selection buttons, and tags.</li>
  <li><strong>Step 3 (Pricing & Dates):</strong> Starting price, optional Buy-It-Now price, optional reserve price, inventory quantity, and start/end datetime selectors.</li>
</ul>

<h2>9.3 4:3 Image Cropping & Compression Pipeline</h2>
<p>Every photo uploaded must conform to the <strong>4:3 aspect ratio</strong>. The <code>ImageCropper</code> provides an interactive viewport with zoom and pan controls. Upon confirmation, the offscreen canvas compresses the image into an 800&times;600 WebP blob at 85% quality. Files are streamed in parallel to Supabase Storage, and public URLs are assigned.</p>

<h2>9.4 Marketplace Discovery & Browse</h2>
<p>The homepage (<code>/</code>) and browse page (<code>/listings</code>) execute live PostgreSQL queries against Supabase:</p>
<div class="code-block">
SELECT * FROM listings 
WHERE status = 'active' 
  AND start_date &lt;= now() 
  AND end_date &gt;= now()
ORDER BY current_price DESC;
</div>

<!-- SECTION 10 -->
<h1>10. Future Scope</h1>
<ul>
  <li><strong>Supabase Realtime WebSocket Bids:</strong> Live bid stream updates pushed to all active viewing clients without page refreshes.</li>
  <li><strong>Escrow Payment Gateway:</strong> Automated payment hold and release upon confirmed delivery via Stripe Connect.</li>
  <li><strong>AI-Assisted Item Grading:</strong> Computer vision model to evaluate listing photos against declared conditions and flag counterfeit items.</li>
  <li><strong>Automated Settlement Cron (pg_cron):</strong> Automatic state transitions from 'active' to 'sold'/'ended' upon expiration, triggering automated winner notifications.</li>
</ul>

<!-- SECTION 11 -->
<h1>11. Execution of the Project</h1>
<h2>11.1 Prerequisites</h2>
<ul>
  <li>Node.js v20.x or higher</li>
  <li>pnpm v9 or v10</li>
  <li>Supabase project instance with PostgreSQL database and Storage enabled</li>
</ul>

<h2>11.2 Environment Configuration</h2>
<div class="code-block">
# .env.local
PUBLIC_SUPABASE_URL=https://&lt;your-project-id&gt;.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_&lt;your-publishable-key&gt;
</div>

<h2>11.3 Database Setup</h2>
<p>Execute the full migration script located at <code>docs/supabase-setup.sql</code> in the Supabase SQL Editor. Ensure the <code>listing-images</code> bucket is set to Public with authenticated upload RLS policies.</p>

<h2>11.4 Running Locally</h2>
<div class="code-block">
# Install all dependencies
pnpm install

# Run development server
pnpm dev
# Available at http://localhost:5173
</div>

<h2>11.5 Building for Production</h2>
<div class="code-block">
# Run TypeScript and Svelte diagnostics check
pnpm check

# Create production build
pnpm build

# Preview build locally
pnpm preview
</div>

</body>
</html>
"""
    with open(HTML_PATH, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"HTML created: {HTML_PATH}")

def build_pdf():
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    ]
    browser = None
    for p in edge_paths:
        if os.path.exists(p):
            browser = p
            break
            
    if not browser:
        print("Warning: No Edge/Chrome executable found for PDF generation.")
        return

    cmd = [
        browser,
        "--headless=new",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={PDF_PATH}",
        HTML_PATH
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(PDF_PATH):
        size_kb = os.path.getsize(PDF_PATH) / 1024
        print(f"PDF created successfully: {PDF_PATH} ({size_kb:.1f} KB)")
    else:
        print(f"PDF creation failed: {res.stderr}")

if __name__ == "__main__":
    print("Building comprehensive Palmyra project documentation...")
    build_docx()
    build_html()
    build_pdf()
    print("All documentation generated successfully!")
