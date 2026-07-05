/* ============================================
   PARALLAX — CONFIG
   Loaded FIRST, before supabase-client.js, math-engine.js, or app.js —
   all of them read CONFIG at script-load time, not just inside functions.
   ============================================ */

const CONFIG = {
    // ⚠️ REPLACE THESE with your real values from:
    // Supabase Dashboard → Project Settings → API → Project URL / anon public key
    SUPABASE_URL: 'PASTE_YOUR_SUPABASE_PROJECT_URL_HERE',
    SUPABASE_ANON_KEY: 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE',
    USERS: ['hussnain', 'faizan', 'alima', 'haroon', 'mahdiya'],
    STORAGE_KEY_PREFIX: 'parallax_',
    CURRENT_SEMESTER: 'Fall 2026' // bump this each new semester; old courses stay archived under their own semester
};
