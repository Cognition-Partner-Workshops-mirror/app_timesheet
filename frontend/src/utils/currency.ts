/**
 * Region-based currency formatting utility.
 * Detects user's locale/region from browser and formats prices accordingly.
 * Falls back to INR (₹) as default since the marketplace is India-focused.
 */

// Supported currency configurations mapped by country code
const CURRENCY_MAP: Record<string, { code: string; symbol: string; locale: string }> = {
  IN: { code: 'INR', symbol: '₹', locale: 'en-IN' },
  US: { code: 'USD', symbol: '$', locale: 'en-US' },
  GB: { code: 'GBP', symbol: '£', locale: 'en-GB' },
  EU: { code: 'EUR', symbol: '€', locale: 'de-DE' },
  AE: { code: 'AED', symbol: 'AED', locale: 'ar-AE' },
  JP: { code: 'JPY', symbol: '¥', locale: 'ja-JP' },
  AU: { code: 'AUD', symbol: 'A$', locale: 'en-AU' },
  CA: { code: 'CAD', symbol: 'C$', locale: 'en-CA' },
  SG: { code: 'SGD', symbol: 'S$', locale: 'en-SG' },
};

// Default currency is INR since this is an India-focused marketplace
const DEFAULT_CURRENCY = CURRENCY_MAP['IN'];

/**
 * Detect user's region from browser locale/timezone.
 * This marketplace is India-focused, so prices are in INR.
 * Region detection adjusts the currency symbol for international users.
 * Users can also override via localStorage key 'preferred_currency_region'.
 */
function detectRegion(): string {
  try {
    // Check if user has set a preference via localStorage
    const preferred = localStorage.getItem('preferred_currency_region');
    if (preferred && CURRENCY_MAP[preferred.toUpperCase()]) {
      return preferred.toUpperCase();
    }

    // Try to extract country from browser language (e.g., 'en-IN' → 'IN')
    const lang = navigator.language || 'en-IN';
    const parts = lang.split('-');
    if (parts.length >= 2) {
      const country = parts[parts.length - 1].toUpperCase();
      if (CURRENCY_MAP[country]) return country;
    }

    // Try timezone-based detection as fallback
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.startsWith('Asia/Kolkata') || tz.startsWith('Asia/Calcutta')) return 'IN';
    if (tz.startsWith('Asia/Dubai')) return 'AE';
    if (tz.startsWith('Asia/Tokyo')) return 'JP';
    if (tz.startsWith('Asia/Singapore')) return 'SG';
    if (tz.startsWith('Europe/London')) return 'GB';
    if (tz.startsWith('Europe/')) return 'EU';
    if (tz.startsWith('Australia/')) return 'AU';
    if (tz.startsWith('America/Toronto')) return 'CA';
    if (tz.startsWith('America/')) return 'US';
  } catch {
    // Fallback silently to default
  }
  // Default to India since this is an Indian event marketplace
  return 'IN';
}

// Cache the detected region so we don't re-detect on every call
let cachedRegion: string | null = null;

/** Get the current region's currency config */
function getCurrencyConfig() {
  if (!cachedRegion) {
    cachedRegion = detectRegion();
  }
  return CURRENCY_MAP[cachedRegion] || DEFAULT_CURRENCY;
}

/**
 * Format a price amount using the user's regional currency.
 * Example: formatPrice(25000) → '₹25,000' (in India) or '$25,000' (in US)
 */
export function formatPrice(amount: number): string {
  const config = getCurrencyConfig();
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback if Intl is not supported
    return `${config.symbol}${amount.toLocaleString()}`;
  }
}

/**
 * Format a price range (min - max) using regional currency.
 * Example: formatPriceRange(25000, 150000) → '₹25,000 - ₹1,50,000'
 */
export function formatPriceRange(min: number, max: number | null): string {
  if (max && max > min) {
    return `${formatPrice(min)} - ${formatPrice(max)}`;
  }
  return `${formatPrice(min)}+`;
}

/** Get just the currency symbol for the current region */
export function getCurrencySymbol(): string {
  return getCurrencyConfig().symbol;
}

/** Get the detected region code */
export function getRegion(): string {
  if (!cachedRegion) {
    cachedRegion = detectRegion();
  }
  return cachedRegion;
}
