// Cliente para Supabase externo (banco de atividades)
import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://lsxjqzrhgznhopqyapoc.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'sb_publishable_1htA7BczszuZuF7hC5WZBw_tBw7DPNL';

export const externalSupabase = createClient(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_ANON_KEY
);