import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/** True when no real Supabase credentials are configured — app runs on localStorage mock */
export const isMockMode =
  !supabaseUrl ||
  supabaseUrl === 'YOUR_SUPABASE_URL' ||
  supabaseUrl.trim() === '';

export const supabase = isMockMode
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
