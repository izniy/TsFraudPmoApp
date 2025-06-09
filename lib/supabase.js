const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SECOND_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECOND_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false // Since this is for scripts, we don't need session persistence
  }
});

module.exports = { supabase }; 