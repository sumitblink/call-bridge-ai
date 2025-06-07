// Supabase client configuration for database connection
// This will be used with Drizzle ORM for database operations

export interface SupabaseConfig {
  url: string;
  key: string;
}

// Get Supabase configuration from environment variables
export function getSupabaseConfig(): SupabaseConfig {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

  if (!url || !key) {
    throw new Error(
      "Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables."
    );
  }

  return { url, key };
}

// Database URL for Drizzle ORM connection
export function getDatabaseUrl(): string {
  const databaseUrl = import.meta.env.VITE_DATABASE_URL || process.env.DATABASE_URL || "";
  
  if (!databaseUrl) {
    console.warn("DATABASE_URL not found. Using in-memory storage.");
    return "";
  }

  return databaseUrl;
}
