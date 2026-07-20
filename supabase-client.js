/* ============================================================================
   Namma Bazar — Shared Supabase Client
   Include the Supabase CDN script FIRST, then this file, then the page's
   own <script> block:

     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="supabase-client.js"></script>

   One client, reused by every page — register.html and seller-login.html
   today; seller-dashboard.html and seller-add-product.html can include the
   same two lines when they're connected in a later phase.
   ============================================================================ */

// TODO: replace with your project's real values — Supabase Dashboard →
// Settings → API. The anon key is safe to expose client-side; every table
// it can touch is protected by the RLS policies already in the migrations.
const SUPABASE_URL = 'https://ycffcsbadcgenttzwfdb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZmZjc2JhZGNnZW50dHp3ZmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MzEyNzMsImV4cCI6MjEwMDEwNzI3M30.KSqo0mm8QSCY9ngQR_STHtsAp2xLWUiJ-RFgE7ulAAE';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
