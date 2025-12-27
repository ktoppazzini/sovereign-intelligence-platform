// app/api/universal-industry-plan/ai-industries/route.js
// [KT:AI-INDUSTRIES-v2.0] ISO ISIC Rev.4 Industry Classification
// Based on UN ISIC Rev.4 (International Standard Industrial Classification)
// https://unstats.un.org/unsd/classifications/Econ/isic

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TAG = '[SR:AI-INDUSTRIES]';

// Cache for industries (long TTL - rarely changes)
let __industriesCache = null;
let __industriesCacheTime = 0;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// ============================================================================
// ISIC Rev.4 - International Standard Industrial Classification
// UN Statistical Division - Complete 21-section taxonomy
// ============================================================================
const ISIC_INDUSTRIES = {
  'A - Agriculture, Forestry & Fishing': {
    icon: '🌾',
    code: 'A',
    subIndustries: [
      '01 - Crop and animal production, hunting and related service activities',
      '011 - Growing of non-perennial crops',
      '012 - Growing of perennial crops',
      '013 - Plant propagation',
      '014 - Animal production',
      '015 - Mixed farming',
      '016 - Support activities to agriculture and post-harvest crop activities',
      '017 - Hunting, trapping and related service activities',
      '02 - Forestry and logging',
      '021 - Silviculture and other forestry activities',
      '022 - Logging',
      '023 - Gathering of non-wood forest products',
      '024 - Support services to forestry',
      '03 - Fishing and aquaculture',
      '031 - Fishing',
      '032 - Aquaculture',
    ],
  },
  'B - Mining & Quarrying': {
    icon: '⛏️',
    code: 'B',
    subIndustries: [
      '05 - Mining of coal and lignite',
      '06 - Extraction of crude petroleum and natural gas',
      '07 - Mining of metal ores',
      '071 - Mining of iron ores',
      '072 - Mining of non-ferrous metal ores',
      '08 - Other mining and quarrying',
      '081 - Quarrying of stone, sand and clay',
      '089 - Mining and quarrying n.e.c.',
      '09 - Mining support service activities',
      '091 - Support activities for petroleum and natural gas extraction',
      '099 - Support activities for other mining and quarrying',
    ],
  },
  'C - Manufacturing': {
    icon: '🏭',
    code: 'C',
    subIndustries: [
      '10 - Manufacture of food products',
      '101 - Processing and preserving of meat',
      '102 - Processing and preserving of fish, crustaceans and molluscs',
      '103 - Processing and preserving of fruit and vegetables',
      '104 - Manufacture of vegetable and animal oils and fats',
      '105 - Manufacture of dairy products',
      '106 - Manufacture of grain mill products, starches and starch products',
      '107 - Manufacture of other food products',
      '108 - Manufacture of prepared animal feeds',
      '11 - Manufacture of beverages',
      '12 - Manufacture of tobacco products',
      '13 - Manufacture of textiles',
      '14 - Manufacture of wearing apparel',
      '15 - Manufacture of leather and related products',
      '16 - Manufacture of wood and products of wood and cork',
      '17 - Manufacture of paper and paper products',
      '18 - Printing and reproduction of recorded media',
      '19 - Manufacture of coke and refined petroleum products',
      '20 - Manufacture of chemicals and chemical products',
      '201 - Manufacture of basic chemicals',
      '202 - Manufacture of other chemical products',
      '203 - Manufacture of man-made fibres',
      '21 - Manufacture of pharmaceuticals, medicinal chemical and botanical products',
      '22 - Manufacture of rubber and plastics products',
      '23 - Manufacture of other non-metallic mineral products',
      '24 - Manufacture of basic metals',
      '241 - Manufacture of basic iron and steel',
      '242 - Manufacture of basic precious and other non-ferrous metals',
      '243 - Casting of metals',
      '25 - Manufacture of fabricated metal products',
      '26 - Manufacture of computer, electronic and optical products',
      '261 - Manufacture of electronic components and boards',
      '262 - Manufacture of computers and peripheral equipment',
      '263 - Manufacture of communication equipment',
      '264 - Manufacture of consumer electronics',
      '265 - Manufacture of measuring, testing, navigating and control equipment',
      '266 - Manufacture of irradiation, electromedical and electrotherapeutic equipment',
      '267 - Manufacture of optical instruments and photographic equipment',
      '268 - Manufacture of magnetic and optical media',
      '27 - Manufacture of electrical equipment',
      '28 - Manufacture of machinery and equipment n.e.c.',
      '29 - Manufacture of motor vehicles, trailers and semi-trailers',
      '30 - Manufacture of other transport equipment',
      '301 - Building of ships and boats',
      '302 - Manufacture of railway locomotives and rolling stock',
      '303 - Manufacture of air and spacecraft and related machinery',
      '304 - Manufacture of military fighting vehicles',
      '309 - Manufacture of transport equipment n.e.c.',
      '31 - Manufacture of furniture',
      '32 - Other manufacturing',
      '321 - Manufacture of jewellery, bijouterie and related articles',
      '322 - Manufacture of musical instruments',
      '323 - Manufacture of sports goods',
      '324 - Manufacture of games and toys',
      '325 - Manufacture of medical and dental instruments and supplies',
      '329 - Other manufacturing n.e.c.',
      '33 - Repair and installation of machinery and equipment',
    ],
  },
  'D - Electricity, Gas, Steam & Air Conditioning': {
    icon: '⚡',
    code: 'D',
    subIndustries: [
      '35 - Electricity, gas, steam and air conditioning supply',
      '351 - Electric power generation, transmission and distribution',
      '352 - Manufacture of gas; distribution of gaseous fuels through mains',
      '353 - Steam and air conditioning supply',
      'Renewable Energy - Solar power generation',
      'Renewable Energy - Wind power generation',
      'Renewable Energy - Hydroelectric power generation',
      'Nuclear power generation',
      'Energy storage and battery systems',
      'Smart grid and distribution systems',
    ],
  },
  'E - Water Supply, Sewerage & Waste Management': {
    icon: '💧',
    code: 'E',
    subIndustries: [
      '36 - Water collection, treatment and supply',
      '37 - Sewerage',
      '38 - Waste collection, treatment and disposal activities; materials recovery',
      '381 - Waste collection',
      '382 - Waste treatment and disposal',
      '383 - Materials recovery',
      '39 - Remediation activities and other waste management services',
    ],
  },
  'F - Construction': {
    icon: '🏗️',
    code: 'F',
    subIndustries: [
      '41 - Construction of buildings',
      '411 - Development of building projects',
      '412 - Construction of residential and non-residential buildings',
      '42 - Civil engineering',
      '421 - Construction of roads and railways',
      '422 - Construction of utility projects',
      '429 - Construction of other civil engineering projects',
      '43 - Specialized construction activities',
      '431 - Demolition and site preparation',
      '432 - Electrical, plumbing and other construction installation activities',
      '433 - Building completion and finishing',
      '439 - Other specialized construction activities',
    ],
  },
  'G - Wholesale & Retail Trade': {
    icon: '🛒',
    code: 'G',
    subIndustries: [
      '45 - Wholesale and retail trade and repair of motor vehicles and motorcycles',
      '451 - Sale of motor vehicles',
      '452 - Maintenance and repair of motor vehicles',
      '453 - Sale of motor vehicle parts and accessories',
      '454 - Sale, maintenance and repair of motorcycles and related parts and accessories',
      '46 - Wholesale trade, except of motor vehicles and motorcycles',
      '461 - Wholesale on a fee or contract basis',
      '462 - Wholesale of agricultural raw materials and live animals',
      '463 - Wholesale of food, beverages and tobacco',
      '464 - Wholesale of household goods',
      '465 - Wholesale of machinery, equipment and supplies',
      '466 - Other specialized wholesale',
      '469 - Non-specialized wholesale trade',
      '47 - Retail trade, except of motor vehicles and motorcycles',
      '471 - Retail sale in non-specialized stores',
      '472 - Retail sale of food, beverages and tobacco in specialized stores',
      '473 - Retail sale of automotive fuel in specialized stores',
      '474 - Retail sale of information and communications equipment',
      '475 - Retail sale of other household equipment in specialized stores',
      '476 - Retail sale of cultural and recreation goods in specialized stores',
      '477 - Retail sale of other goods in specialized stores',
      '478 - Retail sale via stalls and markets',
      '479 - Retail trade not in stores, stalls or markets (e-commerce)',
    ],
  },
  'H - Transportation & Storage': {
    icon: '🚚',
    code: 'H',
    subIndustries: [
      '49 - Land transport and transport via pipelines',
      '491 - Transport via railways',
      '492 - Other land transport',
      '493 - Transport via pipeline',
      '50 - Water transport',
      '501 - Sea and coastal water transport',
      '502 - Inland water transport',
      '51 - Air transport',
      '511 - Passenger air transport',
      '512 - Freight air transport',
      '52 - Warehousing and support activities for transportation',
      '521 - Warehousing and storage',
      '522 - Support activities for transportation',
      '53 - Postal and courier activities',
      '531 - Postal activities',
      '532 - Courier activities',
    ],
  },
  'I - Accommodation & Food Service': {
    icon: '🏨',
    code: 'I',
    subIndustries: [
      '55 - Accommodation',
      '551 - Short-term accommodation activities',
      '552 - Camping grounds, recreational vehicle parks and trailer parks',
      '559 - Other accommodation',
      '56 - Food and beverage service activities',
      '561 - Restaurants and mobile food service activities',
      '562 - Event catering and other food service activities',
      '563 - Beverage serving activities',
    ],
  },
  'J - Information & Communication': {
    icon: '📡',
    code: 'J',
    subIndustries: [
      '58 - Publishing activities',
      '581 - Publishing of books, periodicals and other publishing activities',
      '582 - Software publishing',
      '59 - Motion picture, video and television programme production, sound recording',
      '591 - Motion picture, video and television programme activities',
      '592 - Sound recording and music publishing activities',
      '60 - Programming and broadcasting activities',
      '601 - Radio broadcasting',
      '602 - Television programming and broadcasting activities',
      '61 - Telecommunications',
      '611 - Wired telecommunications activities',
      '612 - Wireless telecommunications activities',
      '613 - Satellite telecommunications activities',
      '619 - Other telecommunications activities',
      '62 - Computer programming, consultancy and related activities',
      '620 - Computer programming, consultancy and related activities',
      '63 - Information service activities',
      '631 - Data processing, hosting and related activities; web portals',
      '639 - Other information service activities',
    ],
  },
  'K - Financial & Insurance Activities': {
    icon: '🏦',
    code: 'K',
    subIndustries: [
      '64 - Financial service activities, except insurance and pension funding',
      '641 - Monetary intermediation',
      '642 - Activities of holding companies',
      '643 - Trusts, funds and similar financial entities',
      '649 - Other financial service activities',
      '65 - Insurance, reinsurance and pension funding',
      '651 - Insurance',
      '652 - Reinsurance',
      '653 - Pension funding',
      '66 - Activities auxiliary to financial service and insurance activities',
      '661 - Activities auxiliary to financial service activities',
      '662 - Activities auxiliary to insurance and pension funding',
      '663 - Fund management activities',
    ],
  },
  'L - Real Estate Activities': {
    icon: '🏠',
    code: 'L',
    subIndustries: [
      '68 - Real estate activities',
      '681 - Real estate activities with own or leased property',
      '682 - Real estate activities on a fee or contract basis',
      'Commercial real estate',
      'Residential real estate',
      'Industrial real estate',
      'Real estate investment trusts (REITs)',
      'Property management',
      'Real estate development',
    ],
  },
  'M - Professional, Scientific & Technical Activities': {
    icon: '🔬',
    code: 'M',
    subIndustries: [
      '69 - Legal and accounting activities',
      '691 - Legal activities',
      '692 - Accounting, bookkeeping and auditing activities; tax consultancy',
      '70 - Activities of head offices; management consultancy activities',
      '701 - Activities of head offices',
      '702 - Management consultancy activities',
      '71 - Architectural and engineering activities; technical testing and analysis',
      '711 - Architectural and engineering activities',
      '712 - Technical testing and analysis',
      '72 - Scientific research and development',
      '721 - Research and experimental development on natural sciences and engineering',
      '722 - Research and experimental development on social sciences and humanities',
      '73 - Advertising and market research',
      '731 - Advertising',
      '732 - Market research and public opinion polling',
      '74 - Other professional, scientific and technical activities',
      '741 - Specialized design activities',
      '742 - Photographic activities',
      '749 - Other professional, scientific and technical activities n.e.c.',
      '75 - Veterinary activities',
    ],
  },
  'N - Administrative & Support Service Activities': {
    icon: '📋',
    code: 'N',
    subIndustries: [
      '77 - Rental and leasing activities',
      '771 - Renting and leasing of motor vehicles',
      '772 - Renting and leasing of personal and household goods',
      '773 - Renting and leasing of other machinery, equipment and tangible goods',
      '774 - Leasing of intellectual property',
      '78 - Employment activities',
      '781 - Activities of employment placement agencies',
      '782 - Temporary employment agency activities',
      '783 - Other human resources provision',
      '79 - Travel agency, tour operator, reservation service activities',
      '791 - Travel agency and tour operator activities',
      '799 - Other reservation service and related activities',
      '80 - Security and investigation activities',
      '801 - Private security activities',
      '802 - Security systems service activities',
      '803 - Investigation activities',
      '81 - Services to buildings and landscape activities',
      '811 - Combined facilities support activities',
      '812 - Cleaning activities',
      '813 - Landscape care and maintenance service activities',
      '82 - Office administrative, office support and other business support activities',
      '821 - Office administrative and support activities',
      '822 - Activities of call centres',
      '823 - Organization of conventions and trade shows',
      '829 - Business support service activities n.e.c.',
    ],
  },
  'O - Public Administration & Defence': {
    icon: '🏛️',
    code: 'O',
    subIndustries: [
      '84 - Public administration and defence; compulsory social security',
      '841 - Administration of the State and economic and social policy of the community',
      '842 - Provision of services to the community as a whole',
      '843 - Compulsory social security activities',
      'Government agencies and departments',
      'Defence and military',
      'Public safety and law enforcement',
      'Regulatory bodies',
      'International organizations',
    ],
  },
  'P - Education': {
    icon: '🎓',
    code: 'P',
    subIndustries: [
      '85 - Education',
      '851 - Pre-primary and primary education',
      '852 - Secondary education',
      '853 - Higher education',
      '854 - Other education',
      '855 - Educational support activities',
      'K-12 education',
      'Universities and colleges',
      'Vocational and technical training',
      'Online education and e-learning',
      'Corporate training and development',
      'Special education services',
    ],
  },
  'Q - Human Health & Social Work Activities': {
    icon: '🏥',
    code: 'Q',
    subIndustries: [
      '86 - Human health activities',
      '861 - Hospital activities',
      '862 - Medical and dental practice activities',
      '869 - Other human health activities',
      '87 - Residential care activities',
      '871 - Residential nursing care facilities',
      '872 - Residential care activities for mental retardation, mental health and substance abuse',
      '873 - Residential care activities for the elderly and disabled',
      '879 - Other residential care activities',
      '88 - Social work activities without accommodation',
      '881 - Social work activities without accommodation for the elderly and disabled',
      '889 - Other social work activities without accommodation',
      'Pharmaceuticals and biotechnology',
      'Medical devices and equipment',
      'Health insurance and managed care',
      'Telehealth and digital health',
      'Clinical research and trials',
    ],
  },
  'R - Arts, Entertainment & Recreation': {
    icon: '🎭',
    code: 'R',
    subIndustries: [
      '90 - Creative, arts and entertainment activities',
      '900 - Creative, arts and entertainment activities',
      '91 - Libraries, archives, museums and other cultural activities',
      '910 - Libraries, archives, museums and other cultural activities',
      '92 - Gambling and betting activities',
      '920 - Gambling and betting activities',
      '93 - Sports activities and amusement and recreation activities',
      '931 - Sports activities',
      '932 - Other amusement and recreation activities',
      'Film and television production',
      'Music and recording industry',
      'Gaming and esports',
      'Theme parks and attractions',
      'Live events and concerts',
    ],
  },
  'S - Other Service Activities': {
    icon: '🔧',
    code: 'S',
    subIndustries: [
      '94 - Activities of membership organizations',
      '941 - Activities of business, employers and professional membership organizations',
      '942 - Activities of trade unions',
      '949 - Activities of other membership organizations',
      '95 - Repair of computers and personal and household goods',
      '951 - Repair of computers and communication equipment',
      '952 - Repair of personal and household goods',
      '96 - Other personal service activities',
      '960 - Other personal service activities',
      'Personal care services (hair, beauty, wellness)',
      'Funeral and related activities',
      'Pet care services',
    ],
  },
  'T - Households as Employers': {
    icon: '🏡',
    code: 'T',
    subIndustries: [
      '97 - Activities of households as employers of domestic personnel',
      '970 - Activities of households as employers of domestic personnel',
      '98 - Undifferentiated goods and services producing activities of private households for own use',
      '981 - Undifferentiated goods-producing activities for own use',
      '982 - Undifferentiated service-producing activities for own use',
    ],
  },
  'U - Extraterritorial Organizations': {
    icon: '🌐',
    code: 'U',
    subIndustries: [
      '99 - Activities of extraterritorial organizations and bodies',
      '990 - Activities of extraterritorial organizations and bodies',
      'United Nations and specialized agencies',
      'International Monetary Fund (IMF)',
      'World Bank Group',
      'World Trade Organization (WTO)',
      'European Union institutions',
      'Other international organizations',
      'Embassies and diplomatic missions',
    ],
  },
};

// ============================================================================
// OpenAI Setup for Translation
// ============================================================================
let __openaiClient = null;
async function getOpenAI() {
  if (__openaiClient) return __openaiClient;
  const { default: OpenAI } = await import('openai');
  __openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  return __openaiClient;
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano-2025-08-07';

// Language-specific cache
const __translationCache = new Map();

function isEnglish(lang) {
  const lc = (lang || '').toLowerCase();
  return !lang || lc === 'english' || lc === 'en' || lc.startsWith('en-');
}

function normalizeLang(lang) {
  if (!lang) return 'English';
  const langMap = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'ar': 'Arabic', 'zh': 'Chinese', 'ja': 'Japanese', 'pt': 'Portuguese',
    'it': 'Italian', 'ru': 'Russian', 'ko': 'Korean', 'hi': 'Hindi',
    'nl': 'Dutch', 'sv': 'Swedish', 'no': 'Norwegian', 'da': 'Danish',
    'pl': 'Polish', 'tr': 'Turkish', 'he': 'Hebrew', 'fa': 'Persian',
    'th': 'Thai', 'vi': 'Vietnamese', 'id': 'Indonesian', 'ms': 'Malay',
  };
  return langMap[lang.toLowerCase()] || lang;
}

// ============================================================================
// Translate Industries to Target Language
// ============================================================================
async function translateIndustries(industries, targetLang) {
  const cacheKey = `industries_${targetLang}`;
  if (__translationCache.has(cacheKey)) {
    console.log(TAG, 'translation.cache.hit', targetLang);
    return __translationCache.get(cacheKey);
  }

  try {
    const openai = await getOpenAI();
    
    // Build list of all strings to translate
    const categoryNames = Object.keys(industries);
    const allSubIndustries = [];
    categoryNames.forEach(cat => {
      industries[cat].subIndustries.forEach(sub => allSubIndustries.push(sub));
    });

    console.log(TAG, 'translation.start', { lang: targetLang, categories: categoryNames.length, subIndustries: allSubIndustries.length });

    // Translate categories
    const catPrompt = `Translate these ISIC industry category names to ${targetLang}. Keep the letter code prefix (e.g., "A - ", "B - "). Return as JSON array in same order.

Categories:
${categoryNames.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Return JSON: { "translations": ["translated name 1", "translated name 2", ...] }`;

    const catRes = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 4000,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: catPrompt }],
    });

    const catParsed = JSON.parse(catRes.choices[0].message.content || '{}');
    const translatedCategories = catParsed.translations || categoryNames;

    // Translate sub-industries in batches (to avoid token limits)
    const BATCH_SIZE = 50;
    const translatedSubIndustries = [];
    
    for (let i = 0; i < allSubIndustries.length; i += BATCH_SIZE) {
      const batch = allSubIndustries.slice(i, i + BATCH_SIZE);
      
      const subPrompt = `Translate these ISIC industry names to ${targetLang}. Keep numeric codes (e.g., "01 - ", "011 - "). Return as JSON array in same order.

Industries:
${batch.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

Return JSON: { "translations": ["translated 1", "translated 2", ...] }`;

      const subRes = await openai.chat.completions.create({
        model: MODEL,
        max_completion_tokens: 4000,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: subPrompt }],
      });

      const subParsed = JSON.parse(subRes.choices[0].message.content || '{}');
      translatedSubIndustries.push(...(subParsed.translations || batch));
    }

    // Rebuild structure with translated names
    const translated = {};
    let subIdx = 0;
    
    categoryNames.forEach((origCat, catIdx) => {
      const newCatName = translatedCategories[catIdx] || origCat;
      const origData = industries[origCat];
      const subCount = origData.subIndustries.length;
      
      translated[newCatName] = {
        icon: origData.icon,
        code: origData.code,
        subIndustries: translatedSubIndustries.slice(subIdx, subIdx + subCount),
      };
      subIdx += subCount;
    });

    __translationCache.set(cacheKey, translated);
    console.log(TAG, 'translation.done', { lang: targetLang });
    
    return translated;
  } catch (e) {
    console.error(TAG, 'translation.error', e.message);
    return industries; // Fallback to English
  }
}

// GET handler
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const langParam = searchParams.get('lang') || 'English';
  const lang = normalizeLang(langParam);
  
  console.log(TAG, 'GET', { lang, source: 'ISIC Rev.4' });
  
  // For English, use cache directly
  if (isEnglish(lang)) {
    if (__industriesCache && Date.now() - __industriesCacheTime < CACHE_TTL) {
      console.log(TAG, 'cache.hit');
      return NextResponse.json({
        ok: true,
        source: 'cache',
        standard: 'ISIC Rev.4',
        lang: 'English',
        industries: __industriesCache,
        categoryCount: Object.keys(__industriesCache).length,
        totalSubIndustries: Object.values(__industriesCache).reduce((sum, cat) => sum + cat.subIndustries.length, 0),
      });
    }
    
    __industriesCache = ISIC_INDUSTRIES;
    __industriesCacheTime = Date.now();
    
    return NextResponse.json({
      ok: true,
      source: 'generated',
      standard: 'ISIC Rev.4',
      lang: 'English',
      industries: ISIC_INDUSTRIES,
      categoryCount: Object.keys(ISIC_INDUSTRIES).length,
      totalSubIndustries: Object.values(ISIC_INDUSTRIES).reduce((sum, cat) => sum + cat.subIndustries.length, 0),
    });
  }
  
  // For non-English, translate
  try {
    const translated = await translateIndustries(ISIC_INDUSTRIES, lang);
    
    return NextResponse.json({
      ok: true,
      source: 'translated',
      standard: 'ISIC Rev.4',
      lang,
      industries: translated,
      categoryCount: Object.keys(translated).length,
      totalSubIndustries: Object.values(translated).reduce((sum, cat) => sum + cat.subIndustries.length, 0),
    });
    
  } catch (e) {
    console.error(TAG, 'error', e.message);
    
    return NextResponse.json({
      ok: true,
      source: 'fallback',
      standard: 'ISIC Rev.4',
      lang: 'English',
      industries: ISIC_INDUSTRIES,
      categoryCount: Object.keys(ISIC_INDUSTRIES).length,
      totalSubIndustries: Object.values(ISIC_INDUSTRIES).reduce((sum, cat) => sum + cat.subIndustries.length, 0),
    });
  }
}
