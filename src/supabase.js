import { createClient } from "@supabase/supabase-js";

const url  = import.meta.env.VITE_SUPABASE_URL;
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY;

// These are injected at build-time via Vite. In dev, add them to a local .env
// file (never commit it). In production, set them in Vercel Environment Variables.
export const supabase = createClient(url, key);
