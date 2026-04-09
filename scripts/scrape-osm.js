#!/usr/bin/env node
/**
 * OpenStreetMap Overpass API Scraper
 * Finds bars, pubs, and restaurants with TVs/sports in World Cup host cities.
 * Free, no API key required.
 *
 * Usage:
 *   node scripts/scrape-osm.js                    # scrape all cities, output JSON
 *   node scripts/scrape-osm.js --city miami       # scrape one city
 *   node scripts/scrape-osm.js --min-score 30     # only venues with relevance >= 30
 *   node scripts/scrape-osm.js --skip-geocode     # skip Nominatim reverse geocoding
 *   node scripts/scrape-osm.js --import           # scrape and POST to local server
 *   node scripts/scrape-osm.js --import --server https://watchparty-app-production.up.railway.app
 */

const https = require('https');
const http = require('http');

// World Cup 2026 US host cities with bounding boxes [south, west, north, east]
const CITIES = {
  miami:       { name: 'Miami',        bbox: [25.65, -80.40, 25.90, -80.10] },
  nyc:         { name: 'New York',     bbox: [40.55, -74.10, 40.90, -73.75] },
  la:          { name: 'Los Angeles',  bbox: [33.85, -118.50, 34.15, -118.15] },
  houston:     { name: 'Houston',      bbox: [29.60, -95.60, 29.90, -95.20] },
  dallas:      { name: 'Dallas',       bbox: [32.65, -97.00, 32.95, -96.60] },
  atlanta:     { name: 'Atlanta',      bbox: [33.65, -84.50, 33.85, -84.30] },
  seattle:     { name: 'Seattle',      bbox: [47.50, -122.45, 47.70, -122.25] },
  sf:          { name: 'San Francisco', bbox: [37.70, -122.52, 37.82, -122.36] },
  philadelphia:{ name: 'Philadelphia', bbox: [39.87, -75.28, 40.05, -75.08] },
  kc:          { name: 'Kansas City',  bbox: [38.90, -94.70, 39.15, -94.45] },
  boston:       { name: 'Boston',       bbox: [42.30, -71.15, 42.40, -71.00] },
};

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Build Overpass QL query for bars/pubs in a bounding box
 * Fetches all bars and pubs — relevance scoring happens post-fetch
 */
function buildQuery(bbox) {
  const [south, west, north, east] = bbox;
  const b = `(${south},${west},${north},${east})`;
  return `
    [out:json][timeout:45];
    (
      node["amenity"="bar"]${b};
      node["amenity"="pub"]${b};
      node["amenity"="restaurant"]["cuisine"~"american|burger|wings|grill",i]${b};
      node["leisure"="sports_centre"]["name"~"bar|pub|grill|tavern",i]${b};
      way["amenity"="bar"]${b};
      way["amenity"="pub"]${b};
    );
    out body center;
  `;
}

/**
 * Score a venue's relevance for sports/World Cup watching (0-100)
 */
function scoreRelevance(tags) {
  let score = 20; // base score for being a bar/pub
  const name = (tags.name || '').toLowerCase();
  const desc = (tags.description || '').toLowerCase();

  // Strong sports signals
  if (tags.sport) score += 40;
  if (/sport|soccer|football|futbol|goal|stadium|athletic|pitch/i.test(name)) score += 35;
  if (/sport|screen|tv|watch|game|match/i.test(desc)) score += 25;

  // Medium signals
  if (tags['sport:tv'] === 'yes' || tags.television === 'yes') score += 30;
  if (tags.real_ale) score += 10;
  if (tags.outdoor_seating === 'yes' || tags.beer_garden === 'yes') score += 5;

  // Pub bonus (pubs are more likely to show sports)
  if (tags.amenity === 'pub') score += 10;

  return Math.min(score, 100);
}

const MIN_RELEVANCE_SCORE = 20; // Include all bars/pubs by default

/**
 * Fetch data from Overpass API
 */
function fetchOverpass(query) {
  return new Promise((resolve, reject) => {
    const postData = `data=${encodeURIComponent(query)}`;
    const url = new URL(OVERPASS_URL);

    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse Overpass response: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Convert OSM element (node or way with center) to our venue format
 */
function osmToVenue(el, cityName) {
  const tags = el.tags || {};
  const name = tags.name || tags['name:en'] || 'Unknown Venue';

  // Handle both nodes (lat/lon) and ways (center.lat/center.lon)
  const lat = el.lat || (el.center && el.center.lat);
  const lng = el.lon || (el.center && el.center.lon);

  // Determine venue type
  let type = 'bar';
  if (tags.amenity === 'pub') type = 'bar';
  if (tags.amenity === 'restaurant') type = 'restaurant';
  if (tags.leisure === 'sports_centre') type = 'fan_zone';
  if (tags.beer_garden === 'yes' || tags.outdoor_seating === 'yes') type = 'outdoor';

  // Build address from OSM tags (may be incomplete — Nominatim fills gaps later)
  const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(' ') || '';

  // Build atmosphere from tags
  const atmoTags = [];
  if (tags.sport) atmoTags.push('Sports');
  if (tags.real_ale) atmoTags.push('Craft Beer');
  if (tags.outdoor_seating === 'yes') atmoTags.push('Outdoor Seating');
  if (tags.beer_garden === 'yes') atmoTags.push('Beer Garden');
  if (tags.live_music === 'yes') atmoTags.push('Live Music');
  if (tags.food === 'yes' || tags.cuisine) atmoTags.push('Food');

  const relevance = scoreRelevance(tags);

  return {
    name,
    type,
    address,
    city: cityName,
    lat,
    lng,
    phone: tags.phone || tags['contact:phone'] || null,
    website: tags.website || tags['contact:website'] || null,
    description: tags.description || `${name} — a ${tags.amenity || 'venue'} in ${cityName}`,
    atmosphere: atmoTags.join(', ') || null,
    capacity: tags.capacity ? parseInt(tags.capacity) : null,
    has_outdoor: tags.outdoor_seating === 'yes' || tags.beer_garden === 'yes',
    has_food: tags.food === 'yes' || !!tags.cuisine,
    drink_specials: null,
    image_url: null,
    source: 'openstreetmap',
    submitted_by: 'osm-scraper',
    _relevance: relevance,
  };
}

/**
 * Reverse geocode coordinates via Nominatim to get a street address
 * Rate limited: 1 request/second per Nominatim usage policy
 */
function reverseGeocode(lat, lng) {
  return new Promise((resolve, reject) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    https.get(url, {
      headers: { 'User-Agent': 'WatchPartyApp/1.0 (venue scraper)' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const addr = result.address || {};
          const parts = [
            addr.house_number,
            addr.road,
            addr.city || addr.town || addr.village,
            addr.state,
          ].filter(Boolean);
          resolve(parts.join(', ') || result.display_name || '');
        } catch (e) {
          resolve('');
        }
      });
    }).on('error', () => resolve(''));
  });
}

/**
 * Batch reverse-geocode venues that have no address
 */
async function fillMissingAddresses(venues, cityName) {
  const needsAddress = venues.filter(v => !v.address);
  if (needsAddress.length === 0) return;

  console.log(`  Reverse geocoding ${needsAddress.length} venues missing addresses...`);
  for (const v of needsAddress) {
    try {
      const addr = await reverseGeocode(v.lat, v.lng);
      if (addr) v.address = addr;
      else v.address = `${cityName} area`;
    } catch (e) {
      v.address = `${cityName} area`;
    }
    // Nominatim rate limit: 1 req/sec
    await new Promise(r => setTimeout(r, 1100));
  }
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
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Server response: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const doImport = args.includes('--import');
  const serverUrl = args.includes('--server') ? args[args.indexOf('--server') + 1] : 'http://localhost:3000';

  // Filter to specific city if requested
  const cityArg = args.includes('--city') ? args[args.indexOf('--city') + 1].toLowerCase() : null;
  const citiesToScrape = cityArg ? { [cityArg]: CITIES[cityArg] } : CITIES;
  const minScore = args.includes('--min-score') ? parseInt(args[args.indexOf('--min-score') + 1]) : MIN_RELEVANCE_SCORE;
  const skipGeocode = args.includes('--skip-geocode');

  if (cityArg && !CITIES[cityArg]) {
    console.error(`Unknown city: ${cityArg}. Available: ${Object.keys(CITIES).join(', ')}`);
    process.exit(1);
  }

  let allVenues = [];

  for (const [key, city] of Object.entries(citiesToScrape)) {
    console.log(`Scraping ${city.name}...`);
    try {
      const query = buildQuery(city.bbox);
      const result = await fetchOverpass(query);

      const venues = (result.elements || [])
        .filter((el) => el.tags && el.tags.name) // Skip unnamed venues
        .map((el) => osmToVenue(el, city.name))
        .filter((v) => v.lat && v.lng) // Must have coordinates
        .filter((v) => v._relevance >= minScore); // Relevance filter

      // Deduplicate by name (case-insensitive), keep highest relevance
      const byName = new Map();
      for (const v of venues) {
        const k = v.name.toLowerCase();
        if (!byName.has(k) || v._relevance > byName.get(k)._relevance) {
          byName.set(k, v);
        }
      }
      const unique = Array.from(byName.values());

      // Sort by relevance (most relevant first)
      unique.sort((a, b) => b._relevance - a._relevance);

      console.log(`  Found ${result.elements?.length || 0} elements -> ${venues.length} named -> ${unique.length} unique (min score: ${minScore})`);

      // Fill missing addresses via Nominatim reverse geocoding
      if (!skipGeocode) {
        await fillMissingAddresses(unique, city.name);
      } else {
        // Set placeholder for venues without addresses
        unique.forEach(v => { if (!v.address) v.address = `${city.name} area`; });
      }

      allVenues = allVenues.concat(unique);

      // Rate limit: Overpass asks for 1 request per second
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      console.error(`  Error scraping ${city.name}: ${err.message}`);
    }
  }

  console.log(`\nTotal: ${allVenues.length} venues across ${Object.keys(citiesToScrape).length} cities`);

  if (doImport && allVenues.length > 0) {
    console.log(`\nImporting to ${serverUrl}...`);
    try {
      const result = await importVenues(allVenues, serverUrl);
      console.log(`Result: ${result.message}`);
    } catch (err) {
      console.error(`Import failed: ${err.message}`);
    }
  } else {
    // Output JSON to stdout
    console.log(JSON.stringify(allVenues, null, 2));
  }
}

main().catch(console.error);
