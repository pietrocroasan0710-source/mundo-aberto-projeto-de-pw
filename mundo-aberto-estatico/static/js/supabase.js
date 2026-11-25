
const SUPABASE_URL = "https://fyubhfcffvukzlsvrqpk.supabase.co";
const SUPABASE_KEY = "sb_publishable_OHlzAJhTZTLaK71ylYjM2A_yFb3JIut";

const { createClient } = supabase;

const supabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
