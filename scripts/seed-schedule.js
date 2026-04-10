#!/usr/bin/env node
/**
 * seed-schedule.js — Seed the full FIFA World Cup 2026 schedule
 *
 * Seeds 48 teams, 104 matches (72 group stage + 32 knockout), and
 * auto-generates watch party events at top venues in each host city.
 *
 * Usage:
 *   node scripts/seed-schedule.js --server https://watchparty-app-production.up.railway.app
 *   node scripts/seed-schedule.js --server http://localhost:3000
 *   node scripts/seed-schedule.js --server http://localhost:3000 --events
 *   node scripts/seed-schedule.js --server http://localhost:3000 --events --clear
 *
 * Flags:
 *   --server URL   Target server (required)
 *   --clear        Clear existing teams/matches/events before seeding
 *   --events       Also auto-generate watch party events at venues
 *   --dry-run      Print data without sending
 */

const args = process.argv.slice(2);
const SERVER = args.find((_, i) => args[i - 1] === '--server') || '';
const CLEAR = args.includes('--clear');
const GEN_EVENTS = args.includes('--events');
const DRY_RUN = args.includes('--dry-run');

if (!SERVER && !DRY_RUN) {
  console.error('Usage: node scripts/seed-schedule.js --server <URL> [--clear] [--events] [--dry-run]');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// 48 TEAMS — Official FIFA World Cup 2026 Groups (post-draw)
// ═══════════════════════════════════════════════════════════════

const teams = [
  // Group A
  { name: 'Mexico', code: 'MEX', group_name: 'A', flag_emoji: '🇲🇽' },
  { name: 'South Africa', code: 'RSA', group_name: 'A', flag_emoji: '🇿🇦' },
  { name: 'Korea Republic', code: 'KOR', group_name: 'A', flag_emoji: '🇰🇷' },
  { name: 'Czechia', code: 'CZE', group_name: 'A', flag_emoji: '🇨🇿' },

  // Group B
  { name: 'Canada', code: 'CAN', group_name: 'B', flag_emoji: '🇨🇦' },
  { name: 'Switzerland', code: 'SUI', group_name: 'B', flag_emoji: '🇨🇭' },
  { name: 'Qatar', code: 'QAT', group_name: 'B', flag_emoji: '🇶🇦' },
  { name: 'Bosnia and Herzegovina', code: 'BIH', group_name: 'B', flag_emoji: '🇧🇦' },

  // Group C
  { name: 'Brazil', code: 'BRA', group_name: 'C', flag_emoji: '🇧🇷' },
  { name: 'Morocco', code: 'MAR', group_name: 'C', flag_emoji: '🇲🇦' },
  { name: 'Haiti', code: 'HAI', group_name: 'C', flag_emoji: '🇭🇹' },
  { name: 'Scotland', code: 'SCO', group_name: 'C', flag_emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },

  // Group D
  { name: 'United States', code: 'USA', group_name: 'D', flag_emoji: '🇺🇸' },
  { name: 'Paraguay', code: 'PAR', group_name: 'D', flag_emoji: '🇵🇾' },
  { name: 'Australia', code: 'AUS', group_name: 'D', flag_emoji: '🇦🇺' },
  { name: 'Türkiye', code: 'TUR', group_name: 'D', flag_emoji: '🇹🇷' },

  // Group E
  { name: 'Germany', code: 'GER', group_name: 'E', flag_emoji: '🇩🇪' },
  { name: 'Curaçao', code: 'CUW', group_name: 'E', flag_emoji: '🇨🇼' },
  { name: "Côte d'Ivoire", code: 'CIV', group_name: 'E', flag_emoji: '🇨🇮' },
  { name: 'Ecuador', code: 'ECU', group_name: 'E', flag_emoji: '🇪🇨' },

  // Group F
  { name: 'Netherlands', code: 'NED', group_name: 'F', flag_emoji: '🇳🇱' },
  { name: 'Japan', code: 'JPN', group_name: 'F', flag_emoji: '🇯🇵' },
  { name: 'Tunisia', code: 'TUN', group_name: 'F', flag_emoji: '🇹🇳' },
  { name: 'Sweden', code: 'SWE', group_name: 'F', flag_emoji: '🇸🇪' },

  // Group G
  { name: 'Belgium', code: 'BEL', group_name: 'G', flag_emoji: '🇧🇪' },
  { name: 'Egypt', code: 'EGY', group_name: 'G', flag_emoji: '🇪🇬' },
  { name: 'Iran', code: 'IRN', group_name: 'G', flag_emoji: '🇮🇷' },
  { name: 'New Zealand', code: 'NZL', group_name: 'G', flag_emoji: '🇳🇿' },

  // Group H
  { name: 'Spain', code: 'ESP', group_name: 'H', flag_emoji: '🇪🇸' },
  { name: 'Cabo Verde', code: 'CPV', group_name: 'H', flag_emoji: '🇨🇻' },
  { name: 'Saudi Arabia', code: 'SAU', group_name: 'H', flag_emoji: '🇸🇦' },
  { name: 'Uruguay', code: 'URU', group_name: 'H', flag_emoji: '🇺🇾' },

  // Group I
  { name: 'France', code: 'FRA', group_name: 'I', flag_emoji: '🇫🇷' },
  { name: 'Senegal', code: 'SEN', group_name: 'I', flag_emoji: '🇸🇳' },
  { name: 'Norway', code: 'NOR', group_name: 'I', flag_emoji: '🇳🇴' },
  { name: 'Iraq', code: 'IRQ', group_name: 'I', flag_emoji: '🇮🇶' },

  // Group J
  { name: 'Argentina', code: 'ARG', group_name: 'J', flag_emoji: '🇦🇷' },
  { name: 'Algeria', code: 'ALG', group_name: 'J', flag_emoji: '🇩🇿' },
  { name: 'Austria', code: 'AUT', group_name: 'J', flag_emoji: '🇦🇹' },
  { name: 'Jordan', code: 'JOR', group_name: 'J', flag_emoji: '🇯🇴' },

  // Group K
  { name: 'Portugal', code: 'POR', group_name: 'K', flag_emoji: '🇵🇹' },
  { name: 'Uzbekistan', code: 'UZB', group_name: 'K', flag_emoji: '🇺🇿' },
  { name: 'Colombia', code: 'COL', group_name: 'K', flag_emoji: '🇨🇴' },
  { name: 'Congo DR', code: 'COD', group_name: 'K', flag_emoji: '🇨🇩' },

  // Group L
  { name: 'England', code: 'ENG', group_name: 'L', flag_emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name: 'Croatia', code: 'CRO', group_name: 'L', flag_emoji: '🇭🇷' },
  { name: 'Ghana', code: 'GHA', group_name: 'L', flag_emoji: '🇬🇭' },
  { name: 'Panama', code: 'PAN', group_name: 'L', flag_emoji: '🇵🇦' },
];

// ═══════════════════════════════════════════════════════════════
// STADIUMS — 16 venues across USA, Mexico, Canada
// ═══════════════════════════════════════════════════════════════

const STADIUMS = {
  azteca:      { name: 'Estadio Azteca', city: 'Mexico City' },
  akron:       { name: 'Estadio Akron', city: 'Guadalajara' },
  bbva:        { name: 'Estadio BBVA', city: 'Monterrey' },
  bmo:         { name: 'BMO Field', city: 'Toronto' },
  bc_place:    { name: 'BC Place', city: 'Vancouver' },
  metlife:     { name: 'MetLife Stadium', city: 'East Rutherford' },
  sofi:        { name: 'SoFi Stadium', city: 'Inglewood' },
  att:         { name: 'AT&T Stadium', city: 'Arlington' },
  hard_rock:   { name: 'Hard Rock Stadium', city: 'Miami Gardens' },
  mercedes:    { name: 'Mercedes-Benz Stadium', city: 'Atlanta' },
  lumen:       { name: 'Lumen Field', city: 'Seattle' },
  levis:       { name: "Levi's Stadium", city: 'Santa Clara' },
  nrg:         { name: 'NRG Stadium', city: 'Houston' },
  gillette:    { name: 'Gillette Stadium', city: 'Foxborough' },
  lincoln:     { name: 'Lincoln Financial Field', city: 'Philadelphia' },
  arrowhead:   { name: 'GEHA Field at Arrowhead Stadium', city: 'Kansas City' },
};

function s(key) { return STADIUMS[key]; }

// ═══════════════════════════════════════════════════════════════
// 72 GROUP STAGE MATCHES
// All times in ET (Eastern Time), ISO 8601 format
// Sources: FIFA.com, NBC Sports, Sky Sports, Yahoo Sports, ESPN
// ═══════════════════════════════════════════════════════════════

const groupMatches = [
  // ──── MATCHDAY 1 (June 11–17) ────

  // June 11 — Opening Day
  { home: 'MEX', away: 'RSA', time: '2026-06-11T15:00:00', ...s('azteca'),    group: 'A' },
  { home: 'KOR', away: 'CZE', time: '2026-06-11T22:00:00', ...s('akron'),     group: 'A' },

  // June 12
  { home: 'CAN', away: 'BIH', time: '2026-06-12T15:00:00', ...s('bmo'),       group: 'B' },
  { home: 'USA', away: 'PAR', time: '2026-06-12T21:00:00', ...s('sofi'),      group: 'D' },

  // June 13
  { home: 'QAT', away: 'SUI', time: '2026-06-13T15:00:00', ...s('levis'),     group: 'B' },
  { home: 'BRA', away: 'MAR', time: '2026-06-13T18:00:00', ...s('metlife'),   group: 'C' },
  { home: 'HAI', away: 'SCO', time: '2026-06-13T21:00:00', ...s('gillette'),  group: 'C' },
  { home: 'AUS', away: 'TUR', time: '2026-06-14T00:00:00', ...s('bc_place'),  group: 'D' },

  // June 14
  { home: 'GER', away: 'CUW', time: '2026-06-14T13:00:00', ...s('nrg'),       group: 'E' },
  { home: 'NED', away: 'JPN', time: '2026-06-14T16:00:00', ...s('att'),       group: 'F' },
  { home: 'CIV', away: 'ECU', time: '2026-06-14T19:00:00', ...s('lincoln'),   group: 'E' },
  { home: 'SWE', away: 'TUN', time: '2026-06-14T22:00:00', ...s('bbva'),      group: 'F' },

  // June 15
  { home: 'ESP', away: 'CPV', time: '2026-06-15T12:00:00', ...s('mercedes'),  group: 'H' },
  { home: 'BEL', away: 'EGY', time: '2026-06-15T15:00:00', ...s('lumen'),     group: 'G' },
  { home: 'SAU', away: 'URU', time: '2026-06-15T18:00:00', ...s('hard_rock'), group: 'H' },
  { home: 'IRN', away: 'NZL', time: '2026-06-15T21:00:00', ...s('sofi'),      group: 'G' },

  // June 16
  { home: 'FRA', away: 'SEN', time: '2026-06-16T15:00:00', ...s('metlife'),   group: 'I' },
  { home: 'IRQ', away: 'NOR', time: '2026-06-16T18:00:00', ...s('gillette'),  group: 'I' },
  { home: 'ARG', away: 'ALG', time: '2026-06-16T21:00:00', ...s('arrowhead'), group: 'J' },
  { home: 'AUT', away: 'JOR', time: '2026-06-17T00:00:00', ...s('levis'),     group: 'J' },

  // June 17
  { home: 'POR', away: 'COD', time: '2026-06-17T13:00:00', ...s('nrg'),       group: 'K' },
  { home: 'ENG', away: 'CRO', time: '2026-06-17T16:00:00', ...s('att'),       group: 'L' },
  { home: 'GHA', away: 'PAN', time: '2026-06-17T19:00:00', ...s('bmo'),       group: 'L' },
  { home: 'UZB', away: 'COL', time: '2026-06-17T22:00:00', ...s('azteca'),     group: 'K' },

  // ──── MATCHDAY 2 (June 18–23) ────

  // June 18 — Groups A & B
  { home: 'CZE', away: 'RSA', time: '2026-06-18T12:00:00', ...s('mercedes'),  group: 'A' },
  { home: 'SUI', away: 'BIH', time: '2026-06-18T15:00:00', ...s('sofi'),      group: 'B' },
  { home: 'CAN', away: 'QAT', time: '2026-06-18T18:00:00', ...s('bc_place'),  group: 'B' },
  { home: 'MEX', away: 'KOR', time: '2026-06-18T21:00:00', ...s('akron'),     group: 'A' },

  // June 19 — Groups C & D
  { home: 'USA', away: 'AUS', time: '2026-06-19T15:00:00', ...s('lumen'),     group: 'D' },
  { home: 'SCO', away: 'MAR', time: '2026-06-19T18:00:00', ...s('gillette'),  group: 'C' },
  { home: 'BRA', away: 'HAI', time: '2026-06-19T21:00:00', ...s('lincoln'),   group: 'C' },
  { home: 'TUR', away: 'PAR', time: '2026-06-19T00:00:00', ...s('levis'),     group: 'D' },

  // June 20 — Groups E & F
  { home: 'NED', away: 'SWE', time: '2026-06-20T13:00:00', ...s('nrg'),       group: 'F' },
  { home: 'GER', away: 'CIV', time: '2026-06-20T16:00:00', ...s('bmo'),       group: 'E' },
  { home: 'ECU', away: 'CUW', time: '2026-06-20T20:00:00', ...s('arrowhead'), group: 'E' },
  { home: 'TUN', away: 'JPN', time: '2026-06-20T00:00:00', ...s('bbva'),      group: 'F' },

  // June 21 — Groups G & H
  { home: 'ESP', away: 'SAU', time: '2026-06-21T12:00:00', ...s('mercedes'),  group: 'H' },
  { home: 'BEL', away: 'IRN', time: '2026-06-21T15:00:00', ...s('sofi'),      group: 'G' },
  { home: 'URU', away: 'CPV', time: '2026-06-21T18:00:00', ...s('hard_rock'), group: 'H' },
  { home: 'NZL', away: 'EGY', time: '2026-06-21T21:00:00', ...s('bc_place'),  group: 'G' },

  // June 22 — Groups I & J
  { home: 'ARG', away: 'AUT', time: '2026-06-22T13:00:00', ...s('att'),       group: 'J' },
  { home: 'FRA', away: 'IRQ', time: '2026-06-22T17:00:00', ...s('lincoln'),   group: 'I' },
  { home: 'NOR', away: 'SEN', time: '2026-06-22T20:00:00', ...s('metlife'),   group: 'I' },
  { home: 'JOR', away: 'ALG', time: '2026-06-22T23:00:00', ...s('levis'),     group: 'J' },

  // June 23 — Groups K & L
  { home: 'POR', away: 'UZB', time: '2026-06-23T13:00:00', ...s('nrg'),       group: 'K' },
  { home: 'ENG', away: 'GHA', time: '2026-06-23T16:00:00', ...s('gillette'),  group: 'L' },
  { home: 'PAN', away: 'CRO', time: '2026-06-23T19:00:00', ...s('bmo'),       group: 'L' },
  { home: 'COL', away: 'COD', time: '2026-06-23T22:00:00', ...s('akron'),     group: 'K' },

  // ──── MATCHDAY 3 (June 24–27) ────

  // June 24 — Groups A, B, C
  { home: 'SUI', away: 'CAN', time: '2026-06-24T15:00:00', ...s('bc_place'),  group: 'B' },
  { home: 'BIH', away: 'QAT', time: '2026-06-24T15:00:00', ...s('lumen'),     group: 'B' },
  { home: 'SCO', away: 'BRA', time: '2026-06-24T18:00:00', ...s('hard_rock'), group: 'C' },
  { home: 'MAR', away: 'HAI', time: '2026-06-24T18:00:00', ...s('mercedes'),  group: 'C' },
  { home: 'CZE', away: 'MEX', time: '2026-06-24T21:00:00', ...s('azteca'),    group: 'A' },
  { home: 'RSA', away: 'KOR', time: '2026-06-24T21:00:00', ...s('bbva'),      group: 'A' },

  // June 25 — Groups D, E, F
  { home: 'ECU', away: 'GER', time: '2026-06-25T16:00:00', ...s('metlife'),   group: 'E' },
  { home: 'CUW', away: 'CIV', time: '2026-06-25T16:00:00', ...s('lincoln'),   group: 'E' },
  { home: 'NED', away: 'TUN', time: '2026-06-25T19:00:00', ...s('arrowhead'), group: 'F' },
  { home: 'SWE', away: 'JPN', time: '2026-06-25T19:00:00', ...s('att'),       group: 'F' },
  { home: 'TUR', away: 'USA', time: '2026-06-25T22:00:00', ...s('sofi'),      group: 'D' },
  { home: 'PAR', away: 'AUS', time: '2026-06-25T22:00:00', ...s('levis'),     group: 'D' },

  // June 26 — Groups G, H, I
  { home: 'NOR', away: 'FRA', time: '2026-06-26T15:00:00', ...s('gillette'),  group: 'I' },
  { home: 'SEN', away: 'IRQ', time: '2026-06-26T15:00:00', ...s('bmo'),       group: 'I' },
  { home: 'CPV', away: 'SAU', time: '2026-06-26T20:00:00', ...s('nrg'),       group: 'H' },
  { home: 'URU', away: 'ESP', time: '2026-06-26T20:00:00', ...s('akron'),     group: 'H' },
  { home: 'NZL', away: 'BEL', time: '2026-06-26T23:00:00', ...s('bc_place'),  group: 'G' },
  { home: 'EGY', away: 'IRN', time: '2026-06-26T23:00:00', ...s('lumen'),     group: 'G' },

  // June 27 — Groups J, K, L
  { home: 'PAN', away: 'ENG', time: '2026-06-27T17:00:00', ...s('metlife'),   group: 'L' },
  { home: 'CRO', away: 'GHA', time: '2026-06-27T17:00:00', ...s('lincoln'),   group: 'L' },
  { home: 'COD', away: 'UZB', time: '2026-06-27T19:30:00', ...s('mercedes'),  group: 'K' },
  { home: 'COL', away: 'POR', time: '2026-06-27T19:30:00', ...s('hard_rock'), group: 'K' },
  { home: 'JOR', away: 'ARG', time: '2026-06-27T22:00:00', ...s('att'),       group: 'J' },
  { home: 'ALG', away: 'AUT', time: '2026-06-27T22:00:00', ...s('arrowhead'), group: 'J' },
];

// ═══════════════════════════════════════════════════════════════
// 32 KNOCKOUT MATCHES
// Teams TBD — venues and dates confirmed by FIFA
// ═══════════════════════════════════════════════════════════════

const knockoutMatches = [
  // Round of 32 (16 matches, June 28 – July 3)
  { home: 'TBD', away: 'TBD', time: '2026-06-28T15:00:00', ...s('sofi'),      stage: 'round_of_32', label: 'R32-1' },
  { home: 'TBD', away: 'TBD', time: '2026-06-28T19:00:00', ...s('arrowhead'), stage: 'round_of_32', label: 'R32-2' },
  { home: 'TBD', away: 'TBD', time: '2026-06-29T13:00:00', ...s('nrg'),       stage: 'round_of_32', label: 'R32-3' },
  { home: 'TBD', away: 'TBD', time: '2026-06-29T16:30:00', ...s('gillette'),  stage: 'round_of_32', label: 'R32-4' },
  { home: 'TBD', away: 'TBD', time: '2026-06-29T21:00:00', ...s('bbva'),      stage: 'round_of_32', label: 'R32-5' },
  { home: 'TBD', away: 'TBD', time: '2026-06-30T13:00:00', ...s('att'),       stage: 'round_of_32', label: 'R32-6' },
  { home: 'TBD', away: 'TBD', time: '2026-06-30T17:00:00', ...s('metlife'),   stage: 'round_of_32', label: 'R32-7' },
  { home: 'TBD', away: 'TBD', time: '2026-06-30T21:00:00', ...s('azteca'),    stage: 'round_of_32', label: 'R32-8' },
  { home: 'TBD', away: 'TBD', time: '2026-07-01T12:00:00', ...s('mercedes'),  stage: 'round_of_32', label: 'R32-9' },
  { home: 'TBD', away: 'TBD', time: '2026-07-01T16:00:00', ...s('lumen'),     stage: 'round_of_32', label: 'R32-10' },
  { home: 'TBD', away: 'TBD', time: '2026-07-01T20:00:00', ...s('levis'),     stage: 'round_of_32', label: 'R32-11' },
  { home: 'TBD', away: 'TBD', time: '2026-07-02T15:00:00', ...s('sofi'),      stage: 'round_of_32', label: 'R32-12' },
  { home: 'TBD', away: 'TBD', time: '2026-07-02T19:00:00', ...s('bmo'),       stage: 'round_of_32', label: 'R32-13' },
  { home: 'TBD', away: 'TBD', time: '2026-07-02T23:00:00', ...s('bc_place'),  stage: 'round_of_32', label: 'R32-14' },
  { home: 'TBD', away: 'TBD', time: '2026-07-03T14:00:00', ...s('att'),       stage: 'round_of_32', label: 'R32-15' },
  { home: 'TBD', away: 'TBD', time: '2026-07-03T18:00:00', ...s('hard_rock'), stage: 'round_of_32', label: 'R32-16' },

  // Round of 16 (8 matches, July 4–6)
  { home: 'TBD', away: 'TBD', time: '2026-07-04T13:00:00', ...s('azteca'),    stage: 'round_of_16', label: 'R16-1' },
  { home: 'TBD', away: 'TBD', time: '2026-07-04T18:00:00', ...s('metlife'),   stage: 'round_of_16', label: 'R16-2' },
  { home: 'TBD', away: 'TBD', time: '2026-07-05T13:00:00', ...s('att'),       stage: 'round_of_16', label: 'R16-3' },
  { home: 'TBD', away: 'TBD', time: '2026-07-05T16:00:00', ...s('sofi'),      stage: 'round_of_16', label: 'R16-4' },
  { home: 'TBD', away: 'TBD', time: '2026-07-05T19:00:00', ...s('mercedes'),  stage: 'round_of_16', label: 'R16-5' },
  { home: 'TBD', away: 'TBD', time: '2026-07-05T22:00:00', ...s('gillette'),  stage: 'round_of_16', label: 'R16-6' },
  { home: 'TBD', away: 'TBD', time: '2026-07-06T15:00:00', ...s('hard_rock'), stage: 'round_of_16', label: 'R16-7' },
  { home: 'TBD', away: 'TBD', time: '2026-07-06T19:00:00', ...s('nrg'),       stage: 'round_of_16', label: 'R16-8' },

  // Quarterfinals (4 matches, July 9–10)
  { home: 'TBD', away: 'TBD', time: '2026-07-09T15:00:00', ...s('sofi'),      stage: 'quarterfinal', label: 'QF-1' },
  { home: 'TBD', away: 'TBD', time: '2026-07-09T19:00:00', ...s('metlife'),   stage: 'quarterfinal', label: 'QF-2' },
  { home: 'TBD', away: 'TBD', time: '2026-07-10T15:00:00', ...s('att'),       stage: 'quarterfinal', label: 'QF-3' },
  { home: 'TBD', away: 'TBD', time: '2026-07-10T19:00:00', ...s('hard_rock'), stage: 'quarterfinal', label: 'QF-4' },

  // Semifinals (2 matches, July 13–14)
  { home: 'TBD', away: 'TBD', time: '2026-07-13T17:00:00', ...s('mercedes'),  stage: 'semifinal', label: 'SF-1' },
  { home: 'TBD', away: 'TBD', time: '2026-07-14T17:00:00', ...s('metlife'),   stage: 'semifinal', label: 'SF-2' },

  // Third-place match
  { home: 'TBD', away: 'TBD', time: '2026-07-18T17:00:00', ...s('hard_rock'), stage: 'third_place', label: '3rd Place' },

  // FINAL
  { home: 'TBD', away: 'TBD', time: '2026-07-19T16:00:00', ...s('metlife'),   stage: 'final', label: 'Final' },
];

// ═══════════════════════════════════════════════════════════════
// BUILD MATCH LIST FOR API
// ═══════════════════════════════════════════════════════════════

function buildMatchPayload() {
  const matches = [];

  // Group stage — real teams
  groupMatches.forEach(m => {
    matches.push({
      home_team_code: m.home,
      away_team_code: m.away,
      kickoff_time: m.time,
      stadium: m.name,
      city: m.city,
      stage: 'group',
      group_name: m.group,
    });
  });

  // Knockout — TBD placeholder teams (we'll need two placeholder teams)
  // For knockout, we use placeholder codes; the server just needs valid team IDs
  // We'll skip knockout TBDs for now and only insert group stage
  // Knockout matches will be added as the tournament progresses

  return matches;
}

// ═══════════════════════════════════════════════════════════════
// AUTO-GENERATE EVENTS — Cold-Start Strategy
// ═══════════════════════════════════════════════════════════════
//
// Strategy: For each group stage match, create watch party events at
// venues in the HOST CITIES where the match is being played, plus
// in cities with strong diaspora connections to the playing teams.
//
// Event types:
//   1. "Stadium District" events — at top venues near the actual stadium
//   2. "Supporter Group" events — for teams with large diaspora communities
//   3. "Neutral" events — general watch parties at popular sports bars
//

async function generateEvents(server, matchIds) {
  // Fetch all approved venues from the server
  console.log('\n📊 Fetching approved venues from server...');
  const venuesRes = await fetch(`${server}/api/venues?limit=5000`);
  const venuesData = await venuesRes.json();
  const venues = venuesData.data || venuesData;
  console.log(`  Found ${venues.length} venues`);

  if (venues.length === 0) {
    console.log('  ⚠ No venues found — skipping event generation');
    return [];
  }

  // Group venues by city (normalize city names)
  const venuesByCity = {};
  venues.forEach(v => {
    // Normalize city for matching (e.g., "Miami Gardens" → also matches "Miami")
    const city = v.city || '';
    const normalizedCities = getCityAliases(city);
    normalizedCities.forEach(c => {
      if (!venuesByCity[c]) venuesByCity[c] = [];
      venuesByCity[c].push(v);
    });
  });

  console.log('  Cities with venues:', Object.keys(venuesByCity).join(', '));

  // Fetch the matches we just inserted to get their IDs
  console.log('  Fetching matches...');
  const matchesRes = await fetch(`${server}/api/matches`);
  const matchesData = await matchesRes.json();
  const allMatches = matchesData.data || matchesData;
  console.log(`  Found ${allMatches.length} matches`);

  // For each group match, generate events at nearby venues
  const events = [];
  const matchCityMap = buildMatchCityVenueMap(allMatches, venuesByCity);

  allMatches.forEach(match => {
    if (match.stage !== 'group') return;

    // Get the stadium city's venues
    const cityVenues = matchCityMap[match.id] || [];
    if (cityVenues.length === 0) return;

    // Pick top 3–5 venues for each match (by capacity, descending)
    const topVenues = cityVenues
      .sort((a, b) => (b.capacity || 0) - (a.capacity || 0))
      .slice(0, Math.min(5, cityVenues.length));

    const homeTeam = match.home_team_name || 'Home';
    const awayTeam = match.away_team_name || 'Away';
    const homeFlag = match.home_team_flag || '';
    const awayFlag = match.away_team_flag || '';

    topVenues.forEach((venue, i) => {
      const isFirst = i === 0;
      events.push({
        venue_id: venue.id,
        match_id: match.id,
        title: isFirst
          ? `${homeFlag} ${homeTeam} vs ${awayTeam} ${awayFlag} — Official Watch Party`
          : `${homeTeam} vs ${awayTeam} Watch Party`,
        description: `Watch ${homeTeam} take on ${awayTeam} live at ${venue.name}. ${venue.description || 'Great atmosphere and drinks!'}`,
        team_affiliation: null,
        organizer_name: venue.name,
        max_capacity: venue.capacity || 100,
      });
    });
  });

  console.log(`\n🎉 Generated ${events.length} watch party events`);
  return events;
}

function getCityAliases(city) {
  const c = city.toLowerCase().trim();
  const aliases = [city];

  // Map stadium cities to their metro areas for venue matching
  const cityMappings = {
    'miami gardens': ['Miami', 'Miami Beach', 'Miami Gardens', 'Coral Gables', 'Doral'],
    'miami': ['Miami', 'Miami Beach', 'Miami Gardens', 'Coral Gables', 'Doral'],
    'east rutherford': ['New York', 'East Rutherford', 'Jersey City', 'Newark', 'Manhattan', 'Brooklyn'],
    'inglewood': ['Los Angeles', 'Inglewood', 'Santa Monica', 'West Hollywood', 'Hollywood'],
    'arlington': ['Dallas', 'Arlington', 'Fort Worth', 'Plano', 'Irving'],
    'foxborough': ['Boston', 'Foxborough', 'Cambridge', 'Somerville'],
    'santa clara': ['San Francisco', 'Santa Clara', 'San Jose', 'Oakland', 'Palo Alto'],
    'atlanta': ['Atlanta', 'Decatur', 'Sandy Springs'],
    'houston': ['Houston', 'Pasadena', 'Sugar Land'],
    'seattle': ['Seattle', 'Bellevue', 'Redmond'],
    'kansas city': ['Kansas City'],
    'philadelphia': ['Philadelphia'],
    'toronto': ['Toronto'],
    'vancouver': ['Vancouver'],
    'mexico city': ['Mexico City', 'Ciudad de México'],
    'guadalajara': ['Guadalajara', 'Zapopan'],
    'monterrey': ['Monterrey', 'Guadalupe', 'San Pedro Garza García'],
  };

  for (const [key, values] of Object.entries(cityMappings)) {
    if (c === key || values.some(v => v.toLowerCase() === c)) {
      return [...new Set([...aliases, ...values])];
    }
  }

  return aliases;
}

function buildMatchCityVenueMap(matches, venuesByCity) {
  const map = {};
  matches.forEach(match => {
    const city = (match.city || '').toLowerCase().trim();
    // Find venues in the match's metro area
    let matchVenues = [];
    for (const [vcity, venues] of Object.entries(venuesByCity)) {
      if (vcity.toLowerCase() === city ||
          getCityAliases(city).some(a => a.toLowerCase() === vcity.toLowerCase())) {
        matchVenues = [...matchVenues, ...venues];
      }
    }
    // Deduplicate
    const seen = new Set();
    map[match.id] = matchVenues.filter(v => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
  });
  return map;
}

// ═══════════════════════════════════════════════════════════════
// MAIN — Send to server
// ═══════════════════════════════════════════════════════════════

async function main() {
  const matchPayload = buildMatchPayload();

  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   World Cup 2026 — Schedule Seeder                ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log(`  Teams:   ${teams.length}`);
  console.log(`  Matches: ${matchPayload.length} (group stage)`);
  console.log(`  Server:  ${SERVER || '(dry run)'}`);
  console.log(`  Clear:   ${CLEAR}`);
  console.log(`  Events:  ${GEN_EVENTS}`);
  console.log('');

  if (DRY_RUN) {
    console.log('=== DRY RUN — Not sending to server ===');
    console.log('\nTeams:');
    teams.forEach(t => console.log(`  ${t.flag_emoji} ${t.name} (${t.code}) — Group ${t.group_name}`));
    console.log(`\nMatches (${matchPayload.length}):`);
    matchPayload.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.home_team_code} vs ${m.away_team_code} | ${m.kickoff_time} | ${m.stadium}, ${m.city} | Group ${m.group_name}`);
    });
    return;
  }

  // Step 1: Seed teams and matches
  console.log('📤 Sending teams and matches to server...');
  const payload = {
    teams,
    matches: matchPayload,
    clear_existing: CLEAR,
  };

  const res = await fetch(`${SERVER}/api/admin/seed-schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  if (!result.success) {
    console.error('✗ Server error:', result.error || result);
    process.exit(1);
  }

  console.log('✓ Schedule seeded:', result.data);

  // Step 2: Auto-generate events (if --events flag)
  if (GEN_EVENTS) {
    const events = await generateEvents(SERVER, null);
    if (events.length > 0) {
      console.log(`\n📤 Sending ${events.length} events to server...`);

      // Batch events into chunks of 50
      const BATCH = 50;
      let inserted = 0;
      for (let i = 0; i < events.length; i += BATCH) {
        const batch = events.slice(i, i + BATCH);
        const evtRes = await fetch(`${SERVER}/api/admin/seed-schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: batch }),
        });
        const evtResult = await evtRes.json();
        inserted += evtResult.data?.events_inserted || 0;
        process.stdout.write(`  Batch ${Math.floor(i / BATCH) + 1}: +${evtResult.data?.events_inserted || 0} events\r`);
      }
      console.log(`\n✓ Events created: ${inserted}`);
    }
  }

  console.log('\n🏆 Done! Schedule is live.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
