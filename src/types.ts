export type PaymentMethod = "stripe" | "upi" | "demo";

export type LiveSignal = {
  countryCode: string;
  createdAt: string;
  paymentMethod: PaymentMethod;
  receiptHash: string;
};

export type CountryStat = {
  code: string;
  name: string;
  lat: number;
  lng: number;
  count: number;
  lastAt: string;
};

export type LatestAwakening = {
  code: string;
  at: string;
  first: boolean;
  receiptHash?: string;
};

export type PublicConfig = {
  brand: "$1 Only";
  payAmount: number;
  netAmount: number;
  currency: string;
  feeNote: string;
  upiEnabled: boolean;
  upiId: string;
  upiName: string;
  upiAmountInr: string;
  demoEnabled: boolean;
};

export type SoulReceipt = {
  receiptHash: string;
  countryCode: string;
  countryName: string;
  createdAt: string;
  paymentMethod: PaymentMethod;
};

export type StatsPayload = {
  total: number;
  countriesAwakened: number;
  byCountry: Record<string, { count: number; lastAt: string }>;
  recent: { countryCode: string; createdAt: string }[];
};
