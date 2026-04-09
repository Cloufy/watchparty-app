#!/usr/bin/env node
/**
 * Google Places API Scraper
 * Finds sports bars and venues showing World Cup games.
 * Requires a Google Places API key.
 *
 * Usage:
 *   GOOGLE_API_KEY=your_key node scripts/scrape-google.js
 *   GOOGLE_API_KEY=your_key node scripts/scrape-google.js --city miami
 *   GOOGLE_API_KEY=your_key node scripts/scrape-google.js --enrich             # fetch phone/website via Details API
 *   GOOGLE_API_KEY=your_key node scripts/scrape-google.js --enrich --max-details 100
 *   GOOGLE_API_KEY=your_key node scripts/scrape-google.js --min-rating 3.5 --min-reviews 20
 *   GOOGLE_API_KEY=your_key node scripts/scrape-google.js --import --server https://watchparty-app-production.up.railway.app
 */

const https = require('https');
const http = require('http');

const API_KEY = process.env.GOOGLE_API_KEY;

// City centers with search radius (meters)
const CITIES = {
  miami:        { name: 'Miami',         lat: 25.7617, lng: -80.1918, radius: 20000 },
  nyc:          { name: 'New York',      lat: 40.7128, lng: -74.0060, radius: 20000 },
  la:           { name: 'Los Angeles',   lat: 34.0522, lng: -118.2437, radius: 25000 },
  houston:      { name: 'Houston',       lat: 29.7604, lng: -95.3698, radius: 20000 },
  dallas:       { name: 'Dallas',        lat: 32.7767, lng: -96.7970, radius: 20000 },
  atlanta:      { name: 'Atlanta',       lat: 33.7490, lng: -84.3880, radius: 15000 },
  seattle:      { name: 'Seattle',       lat: 47.6062, lng: -122.3321, radius: 15000 },
  sf:           { name: 'San Francisco', lat: 37.7749, lng: -122.4194, radius: 12000 },
  philadelphia: { name: 'Philadelphia',  lat: 39.9526, lng: -75.1652, radius: 15000 },
  kc:           { name: 'Kansas City',   lat: 39.0997, lng: -94.5786, radius: 15000 },
  boston:        { name: 'Boston',        lat: 42.3601, lng: -71.0589, radius: 12000 },
};

const SEARCH_QUERIES = [
  'sports bar',
  'soccer bar',
  'football pub',
  'bar with big screen TV',
];

/**
 * Make HTTPS GET request
 */
function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error: ${data.substring(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

/**
 * Search Google Places for venues
 */
async function searchPlaces(query, city) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${city.lat},${city.lng}&radius=${city.radius}&type=bar&key=${API_KEY}`;

  const data = await fetch(url);
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ''}`);
  }

  return (data.results || []).map((place) => ({
    name: place.name,
    type: inferType(place),
    address: place.formatted_address || '',
    city: city.name,
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    phone: null, // Requires Place Details API call
    website: null,
    description: `${place.name} — rated ${place.rating || 'N/A'}/5 (${place.user_ratings_total || 0} reviews)`,
    atmosphere: inferAtmosphere(place),
    capacity: estimateCapacity(place),
    has_outdoor: false,
    has_food: place.types?.includes('restaurant') || place.types?.includes('food'),
    drink_specials: null,
    image_url: place.photos?.[0] ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${API_KEY}` : null,
    source: 'google_places',
    submitted_by: 'google-scraper',
    _rating: place.rating,
    _review_count: place.user_ratings_total,
    _place_id: place.place_id,
  }));
}

function inferType(place) {
  const types = place.types || [];
  if (types.includes('bar') || types.includes('night_club')) return 'bar';
  if (types.includes('restaurant')) return 'restaurant';
  return 'bar';
}

function inferAtmosphere(place) {
  const tags = [];
  if (place.rating >= 4.5) tags.push('Highly Rated');
  if (place.user_ratings_total >= 500) tags.push('Popular');
  if (place.price_level === 1) tags.push('Budget Friendly');
  if (place.price_level >= 3) tags.push('Upscale');
  const types = place.types || [];
  if (types.includes('night_club')) tags.push('Nightlife');
  if (types.includes('restaurant')) tags.push('Full Menu');
  tags.push('Sports');
  return tags.join(', ');
}

function estimateCapacity(place) {
  // Rough estimate based on review volume
  const reviews = place.user_ratings_total || 0;
  if (reviews > 1000) return 200;
  if (reviews > 500) return 150;
  if (reviews > 200) return 100;
  if (reviews > 50) return 60;
  return null;
}

/**
 * Fetch Place Details (phone, website, hours) for a single place
 */
async function fetchPlaceDetails(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,website,opening_hours&key=${API_KEY}`;
  const data = await fetch(url);
  if (data.status !== 'OK') return {};
  const result = data.result || {};
  return {
    phone: result.formatted_phone_number || null,
    website: result.website || null,
    hours: result.opening_hours?.weekday_text?.join('; ') || null,
  };
}

/**
 * Enrich venues with Place Details API data (phone, website)
 */
async function enrichVenues(venues, maxDetails) {
  const toEnrich = venues.slice(0, maxDetails);
  console.log(`\nEnriching ${toEnrich.length} venues via Place Details API (~$${(toEnrich.length * 0.017).toFixed(2)} estimated cost)...`);
  let enriched = 0;
  for (const v of toEnrich) {
    if (!v._place_id) continue;
    try {
      const details = await fetchPlaceDetails(v._place_id);
      if (details.phone) v.phone = details.phone;
      if (details.website) v.website = details.website;
      enriched++;
      // Rate limit
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`  Details error for ${v.name}: ${err.message}`);
    }
  }
  console.log(`  Enriched ${enriched} venues with phone/website data`);
}

/**
 * Filter out low-quality and duplicate chain venues
 */
function filterQuality(venues, minRating, minReviews) {
  // Remove low-quality venues
  let filtered = venues.filter(v => {
    if (v._rating && v._rating < minRating) return false;
    if (v._review_count != null && v._review_count < minReviews) return false;
    return true;
  });

  // Deduplicate chains: keep only the highest-rated per chain name per city
  const chainNames = new Map(); // "chain_name:city" -> best venue
  const nonChain = [];
  const chainPatterns = /^(buffalo wild wings|hooters|applebee|chili'?s|tgi friday|dave & buster|twin peaks|walk-?on'?s|miller'?s ale house)/i;

  for (const v of filtered) {
    const match = v.name.match(chainPatterns);
    if (match) {
      const key = `${match[1].toLowerCase()}:${v.city}`;
      const existing = chainNames.get(key);
      if (!existing || (v._rating || 0) > (existing._rating || 0)) {
        chainNames.set(key, v);
      }
    } else {
      nonChain.push(v);
    }
  }

  return [...nonChain, ...chainNames.values()];
}

/**
 * POST venues to the server
 */
function importVenues(venues, serverUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${serverUrl}/api/venues/bulk`);
    const payload = JSON.stringify({ venues });
    const transport = url.protocol === 'https:' ? https : http;

    const req = transport.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Server: ${data.substring(0, 200)}`)); }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  if (!API_KEY) {
    console.error('Error: Set GOOGLE_API_KEY environment variable');
    console.error('  Get one at: https://console.cloud.google.com/apis/credentials');
    console.error('  Enable "Places API" in your Google Cloud project');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const doImport = args.includes('--import');
  const doEnrich = args.includes('--enrich');
  const serverUrl = args.includes('--server') ? args[args.indexOf('--server') + 1] : 'http://localhost:3000';
  const cityArg = args.includes('--city') ? args[args.indexOf('--city') + 1].toLowerCase() : null;
  const maxDetails = args.includes('--max-details') ? parseInt(args[args.indexOf('--max-details') + 1]) : 200;
  const minRating = args.includes('--min-rating') ? parseFloat(args[args.indexOf('--min-rating') + 1]) : 3.0;
  const minReviews = args.includes('--min-reviews') ? parseInt(args[args.indexOf('--min-reviews') + 1]) : 10;

  const citiesToScrape = cityArg ? { [cityArg]: CITIES[cityArg] } : CITIES;
  if (cityArg && !CITIES[cityArg]) {
    console.error(`Unknown city: ${cityArg}. Available: ${Object.keys(CITIES).join(', ')}`);
    process.exit(1);
  }

  let allVenues = [];

  for (const [key, city] of Object.entries(citiesToScrape)) {
    console.log(`Scraping ${city.name}...`);
    const cityVenues = new Map(); // dedupe by name

    for (const query of SEARCH_QUERIES) {
      try {
        const venues = await searchPlaces(query, city);
        for (const v of venues) {
          const k = v.name.toLowerCase();
          // Keep the one with better rating if duplicate
          if (!cityVenues.has(k) || (v._rating || 0) > (cityVenues.get(k)._rating || 0)) {
            cityVenues.set(k, v);
          }
        }
        // Respect rate limits
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.error(`  Error searching "${query}" in ${city.name}: ${err.message}`);
      }
    }

    const unique = Array.from(cityVenues.values());
    console.log(`  Found ${unique.length} unique venues`);
    allVenues = allVenues.concat(unique);
  }

  // Quality filtering
  const beforeFilter = allVenues.length;
  allVenues = filterQuality(allVenues, minRating, minReviews);
  console.log(`\nQuality filter: ${beforeFilter} -> ${allVenues.length} venues (min rating: ${minRating}, min reviews: ${minReviews})`);

  // Sort by rating (best first)
  allVenues.sort((a, b) => (b._rating || 0) - (a._rating || 0));

  console.log(`Total: ${allVenues.length} venues`);

  // Enrich with Place Details API if requested
  if (doEnrich && allVenues.length > 0) {
    await enrichVenues(allVenues, maxDetails);
  }

  if (doImport && allVenues.length > 0) {
    console.log(`\nImporting to ${serverUrl}...`);
    try {
      const result = await importVenues(allVenues, serverUrl);
      console.log(`Result: ${result.message}`);
    } catch (err) {
      console.error(`Import failed: ${err.message}`);
    }
  } else {
    console.log(JSON.stringify(allVenues, null, 2));
  }
}

main().catch(console.error);
