/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAY_AMOUNT: string;
  readonly VITE_NET_AMOUNT: string;
  readonly VITE_CURRENCY: string;
  readonly VITE_API_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_UPI_ID: string;
  readonly VITE_UPI_NAME: string;
  readonly VITE_UPI_AMOUNT_INR: string;
  readonly VITE_ENABLE_DEMO: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
