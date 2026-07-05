/* ============================================
   PARALLAX — CONFIG
   Loaded FIRST, before supabase-client.js, math-engine.js, or app.js —
   all of them read CONFIG at script-load time, not just inside functions.
   ============================================ */

const CONFIG = {
    // ⚠️ REPLACE THESE with your real values from:
    // Supabase Dashboard → Project Settings → API → Project URL / anon public key
    SUPABASE_URL: https://bgaplkwkdsydoyzypdyj.supabase.co,
    SUPABASE_ANON_KEY: sb_publishable_6GejkhL5abtYuyBFOn8Wqw_Ve8fhhHW,
    USERS: ['hussnain', 'faizan', 'alima', 'haroon', 'mahdiya'],
    STORAGE_KEY_PREFIX: 'parallax_',
    CURRENT_SEMESTER: 'Fall 2026' // bump this each new semester; old courses stay archived under their own semester
};
