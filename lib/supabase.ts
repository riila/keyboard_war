import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/**
 * There are no accounts yet, so the publishable key is all the browser
 * carries. Everything it can reach is guarded by RLS: guest_matches accepts
 * inserts and reads, and nothing else is exposed.
 * Returns null when the keys are missing so the game still runs offline
 * against the bot instead of crashing on a blank screen.
 */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  if (!url || !key) return null;
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return client;
}

export const supabaseConfigured = Boolean(url && key);
