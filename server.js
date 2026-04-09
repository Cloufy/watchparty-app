const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== DATABASE INITIALIZATION ====================

// Global database instance
let db = null;
let SQL = null;

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'watchparty.db');

/**
 * Initialize sql.js and load/create database
 */
async function initializeDatabase() {
  try {
    SQL = await initSqlJs();

    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath);
      db = new SQL.Database(data);
      console.log('✓ Loaded existing database');
    } else {
      db = new SQL.Database();
      console.log('✓ Created new database');
    }

    // Create schema
    createSchema();

    // Check if teams table is empty and seed if necessary
    const teamCount = queryOne('SELECT COUNT(*) as count FROM teams');
    if (teamCount && teamCount.count === 0) {
      console.log('Teams table is empty, seeding database...');
      try {
        const seed = require('./seed');
        seed(db);
        saveDatabase();
        console.log('✓ Database seeded successfully');
      } catch (seedError) {
        console.warn('⚠ Seed file not found or error during seeding:', seedError.message);
      }
    } else if (teamCount) {
      console.log(`✓ Database has ${teamCount.count} teams`);
    }

    console.log('✓ Database schema initialized');
  } catch (error) {
    console.error('✗ Error initializing database:', error);
    throw error;
  }
}

/**
 * Create database schema
 */
function createSchema() {
  const schema = `
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      group_name TEXT NOT NULL,
      flag_emoji TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_team_id INTEGER NOT NULL,
      away_team_id INTEGER NOT NULL,
      kickoff_time TEXT NOT NULL,
      stadium TEXT NOT NULL,
      city TEXT NOT NULL,
      stage TEXT NOT NULL,
      group_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(home_team_id) REFERENCES teams(id),
      FOREIGN KEY(away_team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS venues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      phone TEXT,
      website TEXT,
      description TEXT,
      atmosphere TEXT,
      capacity INTEGER,
      has_outdoor INTEGER DEFAULT 0,
      has_food INTEGER DEFAULT 1,
      drink_specials TEXT,
      image_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venue_id INTEGER NOT NULL,
      match_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      team_affiliation TEXT,
      organizer_name TEXT,
      max_capacity INTEGER,
      rsvp_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(venue_id) REFERENCES venues(id),
      FOREIGN KEY(match_id) REFERENCES matches(id)
    );

    CREATE TABLE IF NOT EXISTS rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(event_id) REFERENCES events(id)
    );

    CREATE INDEX IF NOT EXISTS idx_matches_home_team ON matches(home_team_id);
    CREATE INDEX IF NOT EXISTS idx_matches_away_team ON matches(away_team_id);
    CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON matches(kickoff_time);
    CREATE INDEX IF NOT EXISTS idx_matches_stage ON matches(stage);
    CREATE INDEX IF NOT EXISTS idx_venues_city ON venues(city);
    CREATE INDEX IF NOT EXISTS idx_venues_type ON venues(type);
    CREATE INDEX IF NOT EXISTS idx_events_venue ON events(venue_id);
    CREATE INDEX IF NOT EXISTS idx_events_match ON events(match_id);
    CREATE INDEX IF NOT EXISTS idx_rsvps_event ON rsvps(event_id);
  `;

  // Split and execute each statement
  const statements = schema.split(';').filter(stmt => stmt.trim());
  for (const stmt of statements) {
    try {
      db.run(stmt);
    } catch (error) {
      // Ignore "already exists" errors
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }
}

/**
 * Query helper: retrieve all rows as array of objects
 * @param {string} sql - SQL query with ? placeholders
 * @param {array} params - Query parameters
 * @returns {array} Array of result objects
 */
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Query helper: retrieve single row as object
 * @param {string} sql - SQL query with ? placeholders
 * @param {array} params - Query parameters
 * @returns {object|null} Single result object or null
 */
function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

/**
 * Execute write operation (INSERT, UPDATE, DELETE)
 * @param {string} sql - SQL statement with ? placeholders
 * @param {array} params - Query parameters
 */
function execute(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
}

/**
 * Save database to disk
 */
function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Haversine formula for calculating distance between two coordinates
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({
    error: message,
    status: statusCode,
  });
}

// ==================== API ENDPOINTS ====================

/**
 * GET /api/teams
 * Get all teams, optionally filter by group
 */
app.get('/api/teams', (req, res, next) => {
  try {
    const { group } = req.query;
    let query = 'SELECT * FROM teams';
    const params = [];

    if (group) {
      query += ' WHERE group_name = ?';
      params.push(group);
    }

    query += ' ORDER BY name';
    const teams = queryAll(query, params);

    res.json({
      success: true,
      data: teams,
      count: teams.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/matches
 * Get all matches with optional filters
 * Filters: date, team_id, stage
 */
app.get('/api/matches', (req, res, next) => {
  try {
    const { date, team_id, stage } = req.query;
    let query = `
      SELECT
        m.id,
        m.home_team_id,
        m.away_team_id,
        m.kickoff_time,
        m.stadium,
        m.city,
        m.stage,
        m.group_name,
        ht.name as home_team_name,
        ht.code as home_team_code,
        ht.flag_emoji as home_team_flag,
        at.name as away_team_name,
        at.code as away_team_code,
        at.flag_emoji as away_team_flag
      FROM matches m
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ' AND DATE(m.kickoff_time) = DATE(?)';
      params.push(date);
    }

    if (team_id) {
      query += ' AND (m.home_team_id = ? OR m.away_team_id = ?)';
      params.push(team_id, team_id);
    }

    if (stage) {
      query += ' AND m.stage = ?';
      params.push(stage);
    }

    query += ' ORDER BY m.kickoff_time ASC';

    const matches = queryAll(query, params);

    res.json({
      success: true,
      data: matches,
      count: matches.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/matches/:id
 * Get a single match with team details
 */
app.get('/api/matches/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        m.id,
        m.home_team_id,
        m.away_team_id,
        m.kickoff_time,
        m.stadium,
        m.city,
        m.stage,
        m.group_name,
        ht.name as home_team_name,
        ht.code as home_team_code,
        ht.flag_emoji as home_team_flag,
        ht.group_name as home_team_group,
        at.name as away_team_name,
        at.code as away_team_code,
        at.flag_emoji as away_team_flag,
        at.group_name as away_team_group
      FROM matches m
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      WHERE m.id = ?
    `;

    const match = queryOne(query, [id]);

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found',
      });
    }

    res.json({
      success: true,
      data: match,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/venues
 * Search venues with optional filters
 * Filters: lat, lng, radius (in km), type, match_id
 */
app.get('/api/venues', (req, res, next) => {
  try {
    const { lat, lng, radius = 10, type, match_id } = req.query;

    let query = `
      SELECT DISTINCT v.*
      FROM venues v
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += ' AND v.type = ?';
      params.push(type);
    }

    if (match_id) {
      query += `
        AND v.id IN (
          SELECT DISTINCT venue_id FROM events WHERE match_id = ?
        )
      `;
      params.push(match_id);
    }

    query += ' ORDER BY v.name ASC';

    let venues = queryAll(query, params);

    // Apply distance filtering if lat/lng provided
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radiusKm = parseFloat(radius);

      venues = venues
        .map((venue) => ({
          ...venue,
          distance: haversineDistance(userLat, userLng, venue.lat, venue.lng),
        }))
        .filter((venue) => venue.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);
    }

    res.json({
      success: true,
      data: venues,
      count: venues.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/venues/:id
 * Get a single venue with its upcoming events
 */
app.get('/api/venues/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const venueQuery = 'SELECT * FROM venues WHERE id = ?';
    const venue = queryOne(venueQuery, [id]);

    if (!venue) {
      return res.status(404).json({
        success: false,
        error: 'Venue not found',
      });
    }

    const eventsQuery = `
      SELECT
        e.id,
        e.venue_id,
        e.match_id,
        e.title,
        e.description,
        e.team_affiliation,
        e.organizer_name,
        e.max_capacity,
        e.rsvp_count,
        e.created_at,
        m.kickoff_time,
        ht.name as home_team_name,
        ht.flag_emoji as home_team_flag,
        at.name as away_team_name,
        at.flag_emoji as away_team_flag
      FROM events e
      LEFT JOIN matches m ON e.match_id = m.id
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      WHERE e.venue_id = ?
      ORDER BY m.kickoff_time DESC
    `;

    const events = queryAll(eventsQuery, [id]);

    res.json({
      success: true,
      data: {
        ...venue,
        events,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/events
 * Get all events with optional filters
 * Filters: match_id, team, venue_id
 */
app.get('/api/events', (req, res, next) => {
  try {
    const { match_id, team, venue_id } = req.query;

    let query = `
      SELECT
        e.id,
        e.venue_id,
        e.match_id,
        e.title,
        e.description,
        e.team_affiliation,
        e.organizer_name,
        e.max_capacity,
        e.rsvp_count,
        e.created_at,
        v.name as venue_name,
        v.type as venue_type,
        v.city as venue_city,
        m.kickoff_time,
        m.stadium,
        ht.name as home_team_name,
        ht.flag_emoji as home_team_flag,
        at.name as away_team_name,
        at.flag_emoji as away_team_flag
      FROM events e
      LEFT JOIN venues v ON e.venue_id = v.id
      LEFT JOIN matches m ON e.match_id = m.id
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      WHERE 1=1
    `;
    const params = [];

    if (match_id) {
      query += ' AND e.match_id = ?';
      params.push(match_id);
    }

    if (venue_id) {
      query += ' AND e.venue_id = ?';
      params.push(venue_id);
    }

    if (team) {
      query += ' AND e.team_affiliation = ?';
      params.push(team);
    }

    query += ' ORDER BY m.kickoff_time DESC';

    const events = queryAll(query, params);

    res.json({
      success: true,
      data: events,
      count: events.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/events/:id
 * Get a single event with venue and match details
 */
app.get('/api/events/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        e.id,
        e.venue_id,
        e.match_id,
        e.title,
        e.description,
        e.team_affiliation,
        e.organizer_name,
        e.max_capacity,
        e.rsvp_count,
        e.created_at,
        v.id as venue_id,
        v.name as venue_name,
        v.type as venue_type,
        v.address as venue_address,
        v.city as venue_city,
        v.lat as venue_lat,
        v.lng as venue_lng,
        v.phone as venue_phone,
        v.website as venue_website,
        v.atmosphere as venue_atmosphere,
        v.capacity as venue_capacity,
        v.has_outdoor,
        v.has_food,
        v.drink_specials,
        v.image_url,
        m.id as match_id,
        m.kickoff_time,
        m.stadium,
        m.city as match_city,
        m.stage,
        ht.name as home_team_name,
        ht.code as home_team_code,
        ht.flag_emoji as home_team_flag,
        at.name as away_team_name,
        at.code as away_team_code,
        at.flag_emoji as away_team_flag
      FROM events e
      LEFT JOIN venues v ON e.venue_id = v.id
      LEFT JOIN matches m ON e.match_id = m.id
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      WHERE e.id = ?
    `;

    const event = queryOne(query, [id]);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/events/:id/rsvp
 * RSVP to an event
 * Body: { name, email }
 */
app.post('/api/events/:id/rsvp', (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    // Validate input
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    // Check if event exists
    const eventCheck = queryOne('SELECT id FROM events WHERE id = ?', [id]);
    if (!eventCheck) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    // Insert RSVP
    execute(
      `
      INSERT INTO rsvps (event_id, name, email, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `,
      [id, name, email]
    );

    // Update RSVP count
    const countResult = queryOne('SELECT COUNT(*) as count FROM rsvps WHERE event_id = ?', [id]);
    execute(
      `
      UPDATE events
      SET rsvp_count = ?
      WHERE id = ?
    `,
      [countResult.count, id]
    );

    // Save database to disk
    saveDatabase();

    // Get updated event
    const updatedEvent = queryOne('SELECT * FROM events WHERE id = ?', [id]);

    res.status(201).json({
      success: true,
      data: updatedEvent,
      message: `RSVP recorded for ${name}`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/schedule
 * Get matches grouped by date for calendar display
 */
app.get('/api/schedule', (req, res, next) => {
  try {
    const query = `
      SELECT
        DATE(m.kickoff_time) as date,
        m.id,
        m.home_team_id,
        m.away_team_id,
        m.kickoff_time,
        m.stadium,
        m.city,
        m.stage,
        m.group_name,
        ht.name as home_team_name,
        ht.code as home_team_code,
        ht.flag_emoji as home_team_flag,
        at.name as away_team_name,
        at.code as away_team_code,
        at.flag_emoji as away_team_flag,
        COUNT(e.id) as event_count
      FROM matches m
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      LEFT JOIN events e ON m.id = e.match_id
      GROUP BY m.id
      ORDER BY m.kickoff_time ASC
    `;

    const matches = queryAll(query);

    // Group by date
    const schedule = {};
    matches.forEach((match) => {
      const date = match.date;
      if (!schedule[date]) {
        schedule[date] = [];
      }
      schedule[date].push(match);
    });

    res.json({
      success: true,
      data: schedule,
      count: Object.keys(schedule).length,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== HEALTH CHECK ====================

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// ==================== SPA FALLBACK ====================
// Serve index.html for any non-API route (client-side routing)

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      path: req.path,
    });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== ERROR HANDLING ====================

app.use(errorHandler);

// ==================== SERVER STARTUP ====================

async function start() {
  try {
    // Initialize database
    await initializeDatabase();

    // Periodic database save every 60 seconds
    setInterval(() => {
      if (db) saveDatabase();
    }, 60000);

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║   World Cup 2026 Watch Party Finder - Backend Server       ║
║   Status: Running                                          ║
║   Port: ${PORT}                                                ║
║   Database: ${dbPath}                        ║
║   Engine: sql.js                                           ║
╚════════════════════════════════════════════════════════════╝
      `);

      // Log available endpoints
      console.log('Available Endpoints:');
      console.log('  GET  /health                    - Health check');
      console.log('  GET  /api/teams                 - Get all teams');
      console.log('  GET  /api/matches               - Get all matches');
      console.log('  GET  /api/matches/:id           - Get single match');
      console.log('  GET  /api/venues                - Search venues');
      console.log('  GET  /api/venues/:id            - Get single venue');
      console.log('  GET  /api/events                - Get all events');
      console.log('  GET  /api/events/:id            - Get single event');
      console.log('  POST /api/events/:id/rsvp       - RSVP to event');
      console.log('  GET  /api/schedule              - Get schedule by date');
      console.log('');
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  if (db) {
    saveDatabase();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  if (db) {
    saveDatabase();
  }
  process.exit(0);
});

// Start the server
start();

module.exports = app;
