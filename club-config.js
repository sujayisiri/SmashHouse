// ============================================================
// Club Configuration
// White-Label Configuration for Multi-Tenant Support
// ============================================================

/**
 * How to use this:
 *
 * 1. For single club (simple):
 *    - Set CLUB_SLUG to your club's slug
 *    - App will only show data for that club
 *
 * 2. For multiple clubs (advanced):
 *    - Use subdomain: smashhouse.yourapp.com → slug = 'smash-house'
 *    - Use URL parameter: yourapp.com?club=smash-house
 *    - Use path: yourapp.com/smash-house
 */

// Simple single-club configuration (default)
const CLUB_CONFIG = {
  // Set this to your club's slug from the database
  DEFAULT_CLUB_SLUG: "smash-house",

  // Enable multi-club mode (if true, will try to detect club from URL)
  MULTI_CLUB_MODE: false,

  // Default branding (can be overridden by database values)
  DEFAULT_BRANDING: {
    name: "Smash House",
    primaryColor: "#667eea",
    secondaryColor: "#764ba2",
    logoUrl: null,
  },
};

/**
 * Get the current club slug based on configuration
 * Priority: URL parameter > subdomain > path > default
 */
function getClubSlug() {
  if (!CLUB_CONFIG.MULTI_CLUB_MODE) {
    return CLUB_CONFIG.DEFAULT_CLUB_SLUG;
  }

  // Check URL parameter (?club=smash-house)
  const urlParams = new URLSearchParams(window.location.search);
  const clubParam = urlParams.get("club");
  if (clubParam) return clubParam;

  // Check subdomain (smashhouse.yourapp.com)
  const subdomain = window.location.hostname.split(".")[0];
  if (subdomain && subdomain !== "www" && subdomain !== "localhost") {
    return subdomain;
  }

  // Check path (/smash-house)
  const path = window.location.pathname.split("/")[1];
  if (path) return path;

  // Default
  return CLUB_CONFIG.DEFAULT_CLUB_SLUG;
}

/**
 * Store current club information
 */
let currentClub = {
  id: null,
  slug: getClubSlug(),
  name: CLUB_CONFIG.DEFAULT_BRANDING.name,
  primaryColor: CLUB_CONFIG.DEFAULT_BRANDING.primaryColor,
  secondaryColor: CLUB_CONFIG.DEFAULT_BRANDING.secondaryColor,
  logoUrl: CLUB_CONFIG.DEFAULT_BRANDING.logoUrl,
};

export { CLUB_CONFIG, getClubSlug, currentClub };
