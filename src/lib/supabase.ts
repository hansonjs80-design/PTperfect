import { createClient } from '@supabase/supabase-js';

// Prioritize Environment Variables for Production (Vercel)
const ENV_URL = import.meta.env.VITE_SUPABASE_URL;
const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Hardcoded defaults as fallback (Demo mode)
const DEFAULT_URL = 'https://uorkjldaplvojhcqlkqq.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcmtqbGRhcGx2b2poY3Fsa3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjI0MTksImV4cCI6MjA4NTYzODQxOX0.ETJDubZgNI3TA2UwW4Rlp6Ohv6mcfOBWXdPIUnPksH4';

// Check Local Storage first, then Env Vars, then Hardcoded defaults
const getStoredConfig = () => {
  if (typeof window !== 'undefined') {
    const storedUrl = window.localStorage.getItem('sb_url');
    const storedKey = window.localStorage.getItem('sb_key');
    if (storedUrl && storedKey) {
      return { url: storedUrl, key: storedKey };
    }
  }
  
  // Use Env vars if available, otherwise default
  return { 
    url: ENV_URL || DEFAULT_URL, 
    key: ENV_KEY || DEFAULT_KEY 
  };
};

const config = getStoredConfig();

// Only create the client if the keys are present
export const supabase = (config.url && config.key) 
  ? createClient(config.url, config.key) 
  : null;

// Helper to check if we are in online mode
export const isOnlineMode = () => !!supabase;

// Helper to save config (triggers reload)
export const saveSupabaseConfig = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('sb_url', url);
    window.localStorage.setItem('sb_key', key);
    window.location.reload(); // Reload to re-initialize client
  }
};

export const clearSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('sb_url');
    window.localStorage.removeItem('sb_key');
    window.location.reload();
  }
};

export const testSupabaseConnection = async (url: string, key: string) => {
  try {
    if (!url || !key) return false;
    const tempClient = createClient(url, key);
    const { data, error } = await tempClient.from('beds').select('id').limit(1);
    if (error) {
      console.error('Connection Test Error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Connection Test Exception:', e);
    return false;
  }
};