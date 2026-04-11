const { useState, useEffect, useRef, useCallback } = React;

// ─── API helpers ────────────────────────────────────────────────────
const api = (path) =>
  fetch(`/api${path}`)
    .then((r) => {
      if (!r.ok) throw new Error(`Server error (${r.status})`);
      return r.json();
    })
    .then((r) => (r.data !== undefined ? r.data : r));

// ─── Geolocation helper ────────────────────────────────────────────
const MIAMI_DEFAULT = { lat: 25.76, lng: -80.19 };

function useGeolocation() {
  const [coords, setCoords] = useState(MIAMI_DEFAULT);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setError('Could not get location — showing Miami');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  return { coords, locating, error, locate };
}

// ─── Online/offline hook ───────────────────────────────────────────
function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

// ─── Saved venues (localStorage) ───────────────────────────────────
function getSavedVenues() {
  try { return JSON.parse(localStorage.getItem('savedVenues') || '[]'); } catch { return []; }
}
function toggleSavedVenue(id) {
  const saved = getSavedVenues();
  const idx = saved.indexOf(id);
  if (idx >= 0) saved.splice(idx, 1); else saved.push(id);
  localStorage.setItem('savedVenues', JSON.stringify(saved));
  return saved;
}
function isVenueSaved(id) { return getSavedVenues().includes(id); }

// ─── HTML escape helper ───────────────────────────────────────────
function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Share helper ──────────────────────────────────────────────────
function shareContent(title, text) {
  const url = window.location.origin;
  if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
      const el = document.createElement('div');
      el.className = 'toast'; el.textContent = 'Link copied!';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2500);
    }).catch(() => {});
  } else {
    const waText = encodeURIComponent(`${text}\n${url}`);
    window.open(`https://wa.me/?text=${waText}`, '_blank');
  }
}

// ─── Utility ────────────────────────────────────────────────────────
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function groupBy(arr, fn) {
  return arr.reduce((acc, item) => {
    const key = fn(item);
    (acc[key] = acc[key] || []).push(item);
    return acc;
  }, {});
}

// ─── Icons (inline SVG) ────────────────────────────────────────────
const Icons = {
  map: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  calendar: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  party: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L14 8L20 8L15 12L17 18L12 14L7 18L9 12L4 8L10 8Z"/></svg>,
  search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  back: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:18,height:18}}><polyline points="15 18 9 12 15 6"/></svg>,
  pin: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:14,height:14}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  clock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:14,height:14}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  users: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:14,height:14}}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
};

// ─── App ────────────────────────────────────────────────────────────
function App() {
  const [tab, setTab] = useState('explore');
  const [view, setView] = useState(null);
  const online = useOnlineStatus();

  const navigate = useCallback((v) => setView(v), []);
  const goBack = useCallback(() => setView(null), []);

  return (
    <div id="app">
      {!online && (
        <div className="offline-banner">You're offline — some features may be unavailable</div>
      )}
      <header className="header">
        <span className="header-logo">⚽</span>
        <div>
          <h1>WatchParty</h1>
          <div className="header-sub">FIFA World Cup 2026</div>
        </div>
      </header>

      <main className="main">
        {view ? (
          <DetailView view={view} navigate={navigate} goBack={goBack} />
        ) : tab === 'explore' ? (
          <ExploreTab navigate={navigate} />
        ) : tab === 'matches' ? (
          <MatchesTab navigate={navigate} />
        ) : (
          <EventsTab navigate={navigate} />
        )}
      </main>

      {!view && (
        <nav className="bottom-nav">
          <button className={`nav-item ${tab === 'explore' ? 'active' : ''}`} onClick={() => setTab('explore')}>
            <Icons.map />Explore
          </button>
          <button className={`nav-item ${tab === 'matches' ? 'active' : ''}`} onClick={() => setTab('matches')}>
            <Icons.calendar />Matches
          </button>
          <button className={`nav-item ${tab === 'events' ? 'active' : ''}`} onClick={() => setTab('events')}>
            <Icons.party />Events
          </button>
        </nav>
      )}
    </div>
  );
}

// ─── Explore Tab (Map + Venues) ─────────────────────────────────────
function ExploreTab({ navigate }) {
  const [venues, setVenues] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { coords, locating, error: geoError, locate } = useGeolocation();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api(`/venues?lat=${coords.lat}&lng=${coords.lng}&radius=30`)
      .then((data) => { setVenues(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [coords.lat, coords.lng]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: false }).setView([coords.lat, coords.lng], 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Re-center map when coords change
  useEffect(() => {
    if (mapInstance.current) {
      mapInstance.current.setView([coords.lat, coords.lng], 12);
    }
  }, [coords.lat, coords.lng]);

  useEffect(() => {
    if (!mapInstance.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const display = getFilteredVenues();
    display.forEach((v) => {
      const color = v.type === 'bar' ? '#7c3aed' : v.type === 'fan_zone' ? '#22c55e' : v.type === 'outdoor' ? '#f59e0b' : '#60a5fa';
      const icon = L.divIcon({
        html: `<div style="width:12px;height:12px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8], className: '',
      });
      const marker = L.marker([v.lat, v.lng], { icon })
        .addTo(mapInstance.current)
        .bindPopup(`<b>${escHtml(v.name)}</b><br><small>${escHtml(v.type)}</small>`);
      marker.on('click', () => navigate({ type: 'venue', id: v.id }));
      markersRef.current.push(marker);
    });
  }, [venues, filter, search, navigate]);

  function getFilteredVenues() {
    let result = venues;
    if (filter === 'saved') {
      const saved = getSavedVenues();
      result = result.filter((v) => saved.includes(v.id));
    } else if (filter !== 'all') result = result.filter((v) => v.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((v) =>
        v.name.toLowerCase().includes(q) ||
        (v.atmosphere && v.atmosphere.toLowerCase().includes(q)) ||
        (v.description && v.description.toLowerCase().includes(q)) ||
        (v.address && v.address.toLowerCase().includes(q))
      );
    }
    return result;
  }

  const filtered = getFilteredVenues();
  const types = [
    { key: 'all', label: 'All' }, { key: 'bar', label: 'Bars' },
    { key: 'restaurant', label: 'Restaurants' }, { key: 'fan_zone', label: 'Fan Zones' },
    { key: 'outdoor', label: 'Outdoor' }, { key: 'saved', label: 'Saved' },
  ];

  return (
    <div>
      <div className="map-container">
        <div id="map" ref={mapRef}></div>
        <div className="map-overlay">
          <button className="map-chip" onClick={locate} disabled={locating}>
            {locating ? 'Locating...' : '📍 Near Me'}
          </button>
        </div>
      </div>
      {geoError && <div style={{ padding: '6px 16px', fontSize: 12, color: 'var(--amber)' }}>{geoError}</div>}
      <input
        className="search-bar"
        placeholder="Search venues, neighborhoods, vibes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="filter-bar">
        {types.map((t) => (
          <button key={t.key} className={`filter-chip ${filter === t.key ? 'active' : ''}`} onClick={() => setFilter(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{filtered.length} venues nearby</span>
        <a href="/list-your-venue" style={{ fontSize: 12, color: 'var(--purple-light)' }}>+ List Your Venue</a>
      </div>
      {loading ? (
        <div className="loading"><div className="spinner"></div>Finding venues...</div>
      ) : error ? (
        <div className="empty-state"><div className="icon">⚠️</div><p>{error}</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="icon">📍</div><p>No venues found — try a different filter or search</p></div>
      ) : (
        filtered.map((v) => (
          <div className="card" key={v.id} onClick={() => navigate({ type: 'venue', id: v.id })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="card-title">{v.name}</div>
                <div className="card-subtitle">{v.address}</div>
              </div>
              <span className={`tag ${v.type === 'bar' ? 'tag-purple' : v.type === 'fan_zone' ? 'tag-green' : 'tag-amber'}`}>
                {v.type.replace('_', ' ')}
              </span>
            </div>
            <div className="card-meta">
              {v.capacity && <span><Icons.users /> {v.capacity} capacity</span>}
              {v.distance != null && <span><Icons.pin /> {v.distance.toFixed(1)} km</span>}
              {v.has_outdoor === 1 && <span>🌴 Outdoor</span>}
              {v.has_food === 1 && <span>🍽️ Food</span>}
            </div>
            {v.atmosphere && (
              <div className="atmosphere-tags">
                {v.atmosphere.split(',').slice(0, 4).map((tag) => (
                  <span className="atmo-tag" key={tag}>{tag.trim()}</span>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ─── Matches Tab ────────────────────────────────────────────────────
function MatchesTab({ navigate }) {
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/schedule')
      .then((data) => { setSchedule(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return <div className="loading"><div className="spinner"></div>Loading schedule...</div>;
  if (error) return <div className="empty-state"><div className="icon">⚠️</div><p>{error}</p></div>;

  const dates = Object.keys(schedule).sort();
  const totalMatches = dates.reduce((sum, d) => sum + schedule[d].length, 0);

  return (
    <div>
      <div className="section-header">{totalMatches} matches across {dates.length} match days</div>
      {dates.map((date) => (
        <div key={date}>
          <div className="date-header">{formatDate(date + 'T12:00:00')}</div>
          {schedule[date].map((m) => (
            <div className="match-card" key={m.id} onClick={() => navigate({ type: 'match', id: m.id })}>
              <div className="match-teams">
                <span><span className="match-flag">{m.home_team_flag}</span> {m.home_team_name}</span>
                <span className="vs">vs</span>
                <span>{m.away_team_name} <span className="match-flag">{m.away_team_flag}</span></span>
              </div>
              <div className="match-time">{formatTime(m.kickoff_time)}</div>
              <div className="match-stage">{m.stage.toUpperCase()} — {m.group_name ? `Group ${m.group_name}` : m.stage}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Events Tab ─────────────────────────────────────────────────────
function EventsTab({ navigate }) {
  const [events, setEvents] = useState([]);
  const [teamFilter, setTeamFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const url = teamFilter === 'all' ? '/events' : `/events?team=${encodeURIComponent(teamFilter)}`;
    setLoading(true);
    setError(null);
    api(url)
      .then((data) => { setEvents(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [teamFilter]);

  const teams = ['all', 'USA', 'Mexico', 'Argentina', 'Brazil', 'England', 'Colombia', 'France', 'Germany'];

  return (
    <div>
      <div className="filter-bar">
        {teams.map((t) => (
          <button key={t} className={`filter-chip ${teamFilter === t ? 'active' : ''}`} onClick={() => setTeamFilter(t)}>
            {t === 'all' ? 'All Teams' : t}
          </button>
        ))}
      </div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{events.length} watch parties</span>
        <a href="/create-event" style={{ fontSize: 12, color: 'var(--purple-light)' }}>+ Create Watch Party</a>
      </div>
      {loading ? (
        <div className="loading"><div className="spinner"></div>Loading events...</div>
      ) : error ? (
        <div className="empty-state"><div className="icon">⚠️</div><p>{error}</p></div>
      ) : events.length === 0 ? (
        <div className="empty-state"><div className="icon">🎉</div><p>No events found for this team</p></div>
      ) : (
        events.map((e) => (
          <div className="card" key={e.id} onClick={() => navigate({ type: 'event', id: e.id })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="card-title">{e.title}</div>
              {e.team_affiliation && <span className="tag tag-green">{e.team_affiliation}</span>}
            </div>
            <div className="card-subtitle">
              {e.venue_name || 'TBD'} {e.kickoff_time ? `— ${formatDate(e.kickoff_time)} at ${formatTime(e.kickoff_time)}` : ''}
            </div>
            <div className="card-meta">
              <span><Icons.users /> {e.rsvp_count} going</span>
              {e.max_capacity && <span>Max {e.max_capacity}</span>}
              {e.home_team_name && <span>⚽ {e.home_team_name} vs {e.away_team_name}</span>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Detail Views ───────────────────────────────────────────────────
function DetailView({ view, navigate, goBack }) {
  if (view.type === 'venue') return <VenueDetail id={view.id} navigate={navigate} goBack={goBack} />;
  if (view.type === 'event') return <EventDetail id={view.id} navigate={navigate} goBack={goBack} />;
  if (view.type === 'match') return <MatchDetail id={view.id} navigate={navigate} goBack={goBack} />;
  return null;
}

function VenueDetail({ id, navigate, goBack }) {
  const [venue, setVenue] = useState(null);
  const [saved, setSaved] = useState(isVenueSaved(id));
  const [claimEmail, setClaimEmail] = useState('');
  const [showClaim, setShowClaim] = useState(false);
  const [claimMsg, setClaimMsg] = useState('');

  useEffect(() => { api(`/venues/${id}`).then(setVenue); }, [id]);

  const handleSave = () => { toggleSavedVenue(id); setSaved(!saved); };
  const handleShare = () => shareContent('WatchParty', `Check out ${venue.name} on WatchParty — World Cup 2026 watch party finder!`);
  const handleClaim = async () => {
    if (!claimEmail.trim()) return;
    try {
      const res = await fetch(`/api/venues/${id}/claim`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: claimEmail.trim() }),
      });
      const data = await res.json();
      setClaimMsg(data.success ? 'Claim submitted for review!' : (data.error || 'Failed'));
      if (data.success) { setShowClaim(false); setVenue(prev => ({ ...prev, claim_status: 'pending' })); }
    } catch { setClaimMsg('Network error'); }
    setTimeout(() => setClaimMsg(''), 3000);
  };

  if (!venue) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="detail-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="back-btn" onClick={goBack}><Icons.back /> Back</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }} title={saved ? 'Unsave' : 'Save'}>
              {saved ? '❤️' : '🤍'}
            </button>
            <button onClick={handleShare} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }} title="Share">
              📤
            </button>
          </div>
        </div>
        <div className="detail-title">{venue.name}</div>
        <div className="detail-subtitle">{venue.address}</div>
        <div style={{ marginTop: 8 }}>
          <span className={`tag ${venue.type === 'bar' ? 'tag-purple' : venue.type === 'fan_zone' ? 'tag-green' : 'tag-amber'}`}>
            {venue.type.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="detail-section">
        <h3>About</h3>
        <p style={{ fontSize: 13, color: 'var(--slate-300)', lineHeight: 1.6 }}>{venue.description}</p>
        {venue.atmosphere && (
          <div className="atmosphere-tags" style={{ marginTop: 10 }}>
            {venue.atmosphere.split(',').map((tag) => (
              <span className="atmo-tag" key={tag}>{tag.trim()}</span>
            ))}
          </div>
        )}
      </div>

      <div className="detail-section">
        <h3>Details</h3>
        <div className="detail-row"><span className="label">Capacity</span> {venue.capacity || 'N/A'}</div>
        <div className="detail-row"><span className="label">Outdoor</span> {venue.has_outdoor ? 'Yes' : 'No'}</div>
        <div className="detail-row"><span className="label">Food</span> {venue.has_food ? 'Yes' : 'No'}</div>
        {venue.drink_specials && <div className="detail-row"><span className="label">Specials</span> {venue.drink_specials}</div>}
        {venue.phone && <div className="detail-row"><span className="label">Phone</span> {venue.phone}</div>}
        {venue.website && <div className="detail-row"><span className="label">Website</span> <a href={venue.website} style={{color:'var(--purple-light)'}}>{venue.website}</a></div>}
      </div>

      {!venue.claim_status && (
        <div className="detail-section">
          {!showClaim ? (
            <button onClick={() => setShowClaim(true)} style={{ background: 'none', border: '1px solid var(--slate-700)', borderRadius: 8, padding: '10px 16px', color: 'var(--purple-light)', cursor: 'pointer', fontSize: 13, width: '100%' }}>
              Own this venue? Claim it
            </button>
          ) : (
            <div>
              <h3>Claim This Venue</h3>
              <p style={{ fontSize: 12, color: 'var(--slate-400)', marginBottom: 8 }}>Enter your email to submit a claim. We'll verify and approve it.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="your@email.com" type="email" value={claimEmail} onChange={(e) => setClaimEmail(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: 'var(--slate-800)', border: '1px solid var(--slate-700)', color: 'var(--slate-100)', fontSize: 13 }} />
                <button onClick={handleClaim} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--purple)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Submit</button>
              </div>
            </div>
          )}
        </div>
      )}
      {venue.claim_status === 'approved' && (
        <div style={{ padding: '0 16px 8px' }}>
          <span className="tag tag-green" style={{ fontSize: 11 }}>Verified venue</span>
        </div>
      )}

      {venue.events && venue.events.length > 0 && (
        <div className="detail-section">
          <h3>Upcoming Watch Parties</h3>
          {venue.events.map((e) => (
            <div className="card" key={e.id} onClick={() => navigate({ type: 'event', id: e.id })} style={{ marginLeft: 0, marginRight: 0 }}>
              <div className="card-title">{e.title}</div>
              <div className="card-subtitle">{e.kickoff_time ? `${formatDate(e.kickoff_time)} at ${formatTime(e.kickoff_time)}` : ''}</div>
              <div className="card-meta">
                <span><Icons.users /> {e.rsvp_count} going</span>
                {e.team_affiliation && <span className="tag tag-green">{e.team_affiliation}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {claimMsg && <div className="toast">{claimMsg}</div>}
    </div>
  );
}

function EventDetail({ id, navigate, goBack }) {
  const [event, setEvent] = useState(null);
  const [showRsvp, setShowRsvp] = useState(false);
  const [rsvpName, setRsvpName] = useState('');
  const [rsvpEmail, setRsvpEmail] = useState('');
  const [toast, setToast] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api(`/events/${id}`).then(setEvent); }, [id]);

  const handleRsvp = async () => {
    if (!rsvpName.trim() || !rsvpEmail.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${id}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: rsvpName.trim(), email: rsvpEmail.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'RSVP failed');
      setEvent((prev) => ({ ...prev, rsvp_count: json.data.rsvp_count }));
      setShowRsvp(false);
      setRsvpName('');
      setRsvpEmail('');
      setToast('You\'re in! See you there 🎉');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setToast('Oops — ' + err.message);
      setTimeout(() => setToast(''), 3000);
    }
    setSubmitting(false);
  };

  if (!event) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={goBack}><Icons.back /> Back</button>
        <div className="detail-title">{event.title}</div>
        <div className="detail-subtitle">
          {event.venue_name && `at ${event.venue_name}`}
          {event.kickoff_time && ` — ${formatDate(event.kickoff_time)} at ${formatTime(event.kickoff_time)}`}
        </div>
        {event.team_affiliation && (
          <div style={{ marginTop: 8 }}><span className="tag tag-green">{event.team_affiliation} fans</span></div>
        )}
      </div>

      {event.home_team_name && (
        <div className="match-card" style={{ margin: '12px 12px 0' }} onClick={() => navigate({ type: 'match', id: event.match_id })}>
          <div className="match-teams">
            <span>{event.home_team_flag} {event.home_team_name}</span>
            <span className="vs">vs</span>
            <span>{event.away_team_name} {event.away_team_flag}</span>
          </div>
          <div className="match-time">{event.kickoff_time && formatTime(event.kickoff_time)}</div>
        </div>
      )}

      <div className="detail-section">
        <h3>About This Event</h3>
        <p style={{ fontSize: 13, color: 'var(--slate-300)', lineHeight: 1.6 }}>{event.description}</p>
      </div>

      <div className="detail-section">
        <h3>Details</h3>
        {event.organizer_name && <div className="detail-row"><span className="label">Organizer</span> {event.organizer_name}</div>}
        <div className="detail-row"><span className="label">Going</span> {event.rsvp_count} {event.max_capacity ? `/ ${event.max_capacity}` : ''}</div>
        {event.venue_address && <div className="detail-row"><span className="label">Location</span> {event.venue_address}</div>}
      </div>

      {event.venue_id && (
        <div style={{ padding: '0 16px 8px' }}>
          <div className="card" onClick={() => navigate({ type: 'venue', id: event.venue_id })} style={{ marginLeft: 0, marginRight: 0 }}>
            <div className="card-title">📍 {event.venue_name}</div>
            <div className="card-subtitle">{event.venue_address}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, padding: '0 16px 8px' }}>
        <button onClick={() => shareContent(event.title, `Watch party at ${event.venue_name || 'a great venue'}! ${event.kickoff_time ? formatDate(event.kickoff_time) : ''}`)}
          style={{ flex: 1, padding: '10px 16px', borderRadius: 8, background: 'var(--slate-800)', border: '1px solid var(--slate-700)', color: 'var(--purple-light)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          📤 Share
        </button>
      </div>

      {!showRsvp ? (
        <button className="rsvp-btn" onClick={() => setShowRsvp(true)}>
          RSVP — I'm Going! ({event.rsvp_count} attending)
        </button>
      ) : (
        <div className="rsvp-form">
          <input placeholder="Your name" value={rsvpName} onChange={(e) => setRsvpName(e.target.value)} />
          <input placeholder="Email address" type="email" value={rsvpEmail} onChange={(e) => setRsvpEmail(e.target.value)} />
          <button className="rsvp-btn" onClick={handleRsvp} disabled={submitting} style={{ margin: 0, width: '100%' }}>
            {submitting ? 'Submitting...' : 'Confirm RSVP'}
          </button>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function MatchDetail({ id, navigate, goBack }) {
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api(`/matches/${id}`).then(setMatch);
    api(`/events?match_id=${id}`).then(setEvents);
  }, [id]);

  if (!match) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={goBack}><Icons.back /> Back</button>
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: 36 }}>{match.home_team_flag} vs {match.away_team_flag}</div>
          <div className="detail-title" style={{ textAlign: 'center' }}>{match.home_team_name} vs {match.away_team_name}</div>
          <div className="detail-subtitle" style={{ textAlign: 'center' }}>
            {formatDate(match.kickoff_time)} at {formatTime(match.kickoff_time)}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--slate-400)' }}>
            {match.stadium}, {match.city}
          </div>
          <div style={{ marginTop: 8 }}>
            <span className="tag tag-purple">{match.stage.toUpperCase()}</span>
            {match.group_name && <span className="tag tag-amber" style={{ marginLeft: 6 }}>Group {match.group_name}</span>}
          </div>
        </div>
      </div>

      <div className="section-header">{events.length} watch parties for this match</div>
      {events.length === 0 ? (
        <div className="empty-state"><div className="icon">🎉</div><p>No watch parties yet — <a href="/create-event" style={{ color: 'var(--purple-light)' }}>create one!</a></p></div>
      ) : (
        events.map((e) => (
          <div className="card" key={e.id} onClick={() => navigate({ type: 'event', id: e.id })}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="card-title">{e.title}</div>
              {e.team_affiliation && <span className="tag tag-green">{e.team_affiliation}</span>}
            </div>
            <div className="card-subtitle">{e.venue_name}</div>
            <div className="card-meta">
              <span><Icons.users /> {e.rsvp_count} going</span>
              {e.max_capacity && <span>Max {e.max_capacity}</span>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Mount ──────────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
