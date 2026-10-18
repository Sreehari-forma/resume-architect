export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Raw configuration is optional because local no-key builds support demo mode.
      // Runtime environment helpers validate and narrow these values before use.
      NEXT_PUBLIC_SUPABASE_URL?: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
      NEXT_PUBLIC_APP_URL?: string;
      // Server-only: never prefix these credentials with NEXT_PUBLIC_.
      GEMINI_API_KEY?: string;
      GEMINI_MODEL?: string;
      VERCEL_ENV?: string;
      VERCEL_URL?: string;
      VERCEL_PROJECT_PRODUCTION_URL?: string;
    }
  }
}
