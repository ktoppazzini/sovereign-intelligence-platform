// config/countries.gov.ts
export type GovCountry = {
  name: string;
  iso2: string;
  wikidataQID: string; // Country entity QID
  languages: string[]; // preference order (Wikidata label fallback)
  enabled: boolean; // toggle for test vs prod
};

export const GOV_COUNTRIES: GovCountry[] = [
  // ---- Top 5 ON for testing ----
  { name: 'United States', iso2: 'US', wikidataQID: 'Q30', languages: ['en'], enabled: true },
  { name: 'Canada', iso2: 'CA', wikidataQID: 'Q16', languages: ['fr', 'en'], enabled: true },
  { name: 'United Kingdom', iso2: 'GB', wikidataQID: 'Q145', languages: ['en'], enabled: true },
  { name: 'Australia', iso2: 'AU', wikidataQID: 'Q408', languages: ['en'], enabled: true },
  { name: 'India', iso2: 'IN', wikidataQID: 'Q668', languages: ['hi', 'en'], enabled: true },

  // ---- Examples: leave disabled until you’re ready ----
  // { name: 'France',        iso2: 'FR', wikidataQID: 'Q142', languages: ['fr','en'],  enabled: false },
  // { name: 'Germany',       iso2: 'DE', wikidataQID: 'Q183', languages: ['de','en'],  enabled: false },
  // { name: 'Japan',         iso2: 'JP', wikidataQID: 'Q17',  languages: ['ja','en'],  enabled: false },
  // { name: 'Brazil',        iso2: 'BR', wikidataQID: 'Q155', languages: ['pt','en'],  enabled: false },
  // { name: 'Mexico',        iso2: 'MX', wikidataQID: 'Q96',  languages: ['es','en'],  enabled: false },
  // Add as many as you like…
];
