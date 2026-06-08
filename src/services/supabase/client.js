import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

const env = () => import.meta.env || {};

export function getSupabaseMirrorConfig() {
  const currentEnv = env();
  const url = currentEnv.VITE_SUPABASE_URL || '';
  const publishableKey = currentEnv.VITE_SUPABASE_PUBLISHABLE_KEY || currentEnv.VITE_SUPABASE_ANON_KEY || '';
  const enabled = currentEnv.VITE_SUPABASE_MIRROR_ENABLED === 'true';
  const audioBucket = currentEnv.VITE_SUPABASE_AUDIO_BUCKET || 'survey-audio';

  return {
    url,
    publishableKey,
    audioBucket,
    configured: Boolean(url && publishableKey),
    enabled: Boolean(enabled && url && publishableKey),
  };
}

export function isSupabaseMirrorEnabled() {
  return getSupabaseMirrorConfig().enabled;
}

export function getSupabaseClient() {
  const config = getSupabaseMirrorConfig();
  if (!config.configured) {
    throw new Error('Supabase mirror is not configured.');
  }

  if (!supabaseClient) {
    supabaseClient = createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return supabaseClient;
}
