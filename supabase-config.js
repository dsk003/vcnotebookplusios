// Supabase Configuration
// Replace these with your actual Supabase project credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';

// Database table name
const NOTES_TABLE = 'notes';

module.exports = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    NOTES_TABLE
};
