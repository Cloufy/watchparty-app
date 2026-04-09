# WatchParty — MVP Scope & Technical Architecture

## Product Vision
A mobile-first PWA that helps fans find World Cup 2026 watch parties, bar screenings, and fan events near them. Think "Yelp meets Meetup for match day."

---

## MVP Scope (Ship before June 11, 2026)

### Core Features (Must-Have)
1. **Match Schedule** — Browse upcoming World Cup matches with times, teams, and groups
2. **Venue Discovery** — Map-based and list-based search for bars/restaurants/fan zones showing games
3. **Event Listings** — Watch parties, supporter group meetups, and fan festivals with RSVP
4. **Team Filtering** — "Show me where USA fans are watching" / "Find Mexico supporters nearby"
5. **Venue Profiles** — Atmosphere tags, photos, capacity, drink specials, which matches they're showing
6. **Location-based Search** — "Near me" with radius filtering

### Nice-to-Have (Post-MVP)
- User accounts and saved venues
- Social features (invite friends, share plans)
- Push notifications for match reminders
- Venue owner self-service portal
- Ratings and reviews
- Multi-city expansion

### Out of Scope for MVP
- Payment processing / ticketed events
- Live scores or streaming integration
- Chat or messaging
- Native mobile apps

---

## Technical Architecture

### Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + Vite | Fast builds, modern DX, great PWA support |
| Maps | Leaflet + OpenStreetMap | Free, no API key, mobile-friendly |
| Styling | Tailwind CSS | Rapid UI development, mobile-first utilities |
| Backend | Node.js + Express | Simple, fast, JavaScript full-stack |
| Database | SQLite (→ PostgreSQL) | Zero-config for MVP, easy migration path |
| Hosting | Any VPS / Vercel + Railway | Cheap, fast deploy |

### API Design

```
GET  /api/matches              — List matches (filterable by date, team, group)
GET  /api/matches/:id          — Single match details
GET  /api/venues               — Search venues (lat, lng, radius, matchId, team)
GET  /api/venues/:id           — Venue profile with events
GET  /api/events               — List watch party events (filterable)
GET  /api/events/:id           — Single event details
POST /api/events/:id/rsvp      — RSVP to an event (no auth for MVP)
GET  /api/teams                — List all teams in the tournament
```

### Data Model

```
teams
  id, name, code, group, flag_url

matches
  id, home_team_id, away_team_id, kickoff_time, venue_name, city, stage, group

venues (bars/restaurants/fan zones)
  id, name, type, address, city, lat, lng, phone, website,
  description, atmosphere_tags, capacity, has_outdoor, has_food,
  drink_specials, image_url

events (watch parties at venues)
  id, venue_id, match_id, title, description, team_affiliation,
  organizer_name, max_capacity, rsvp_count, created_at

rsvps
  id, event_id, name, email, created_at
```

### PWA Features
- **Service Worker** — Cache shell + static assets for instant load
- **Web App Manifest** — "Add to Home Screen" with custom icon and splash
- **Responsive Design** — Phone-first, works on tablet and desktop
- **Geolocation API** — "Near me" venue search

### Proof-of-Concept City: Miami
- Hard Rock Stadium is a host venue (7 matches scheduled)
- Massive Latin American diaspora = built-in fan communities
- Strong bar/restaurant scene in Brickell, Wynwood, South Beach, Little Havana
- Diverse team affiliations (Argentina, Colombia, Brazil, Mexico, USA)

---

## Build Estimate

| Phase | Timeline | Effort |
|-------|----------|--------|
| MVP (1 city, core features) | 6-8 weeks | 1-2 developers |
| Multi-city expansion | +2-3 weeks | Data seeding + minor UI |
| Venue owner portal | +3-4 weeks | Auth, dashboard, self-service |
| Social features | +4-6 weeks | Accounts, friends, sharing |

---

## Prototype Included

This repo includes a working full-stack prototype with:
- Express server with SQLite database
- React frontend with Leaflet map integration
- Sample Miami venue and event data
- PWA manifest and service worker
- All 48 World Cup teams and group-stage schedule

**To run:** `cd watchparty-app && npm install && npm start` → Open http://localhost:3000
