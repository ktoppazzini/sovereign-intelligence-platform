export type GovCountry = { code: string; name: string; languages: string[] };

// Enable a few for testing; keep the whole world commented to scale later.
export const COUNTRIES: GovCountry[] = [
  // TOP 5 (enabled)
  { code: 'US', name: 'United States', languages: ['en'] },
  { code: 'CA', name: 'Canada', languages: ['en', 'fr'] },
  { code: 'GB', name: 'United Kingdom', languages: ['en'] },
  { code: 'FR', name: 'France', languages: ['fr'] },
  { code: 'DE', name: 'Germany', languages: ['de'] },

  // EXAMPLES (commented)
  // { code: 'JP', name: 'Japan', languages: ['ja'] },
  // { code: 'BR', name: 'Brazil', languages: ['pt'] },
  // { code: 'MX', name: 'Mexico', languages: ['es'] },
  // { code: 'IN', name: 'India', languages: ['hi', 'en'] },
  // { code: 'CN', name: 'China', languages: ['zh'] },
];
