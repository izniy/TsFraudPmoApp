import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SECOND_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SECOND_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: undefined,
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
}); 