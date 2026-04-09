module.exports = function seed(db) {
  // NOTE: Tables are already created by server.js — this only inserts data.
  // Server schema columns:
  //   teams: id, name, code, group_name, flag_emoji
  //   matches: id, home_team_id, away_team_id, kickoff_time, stadium, city, stage, group_name
  //   venues: id, name, type, address, city, lat, lng, phone, website, description, atmosphere, capacity, has_outdoor, has_food, drink_specials, image_url
  //   events: id, venue_id, match_id, title, description, team_affiliation, organizer_name, max_capacity, rsvp_count
  //   rsvps: id, event_id, name, email

  // ===== 48 TEAMS =====
  const teams = [
    ['USA','USA','A','🇺🇸'],['Colombia','COL','A','🇨🇴'],['New Zealand','NZL','A','🇳🇿'],['Senegal','SEN','A','🇸🇳'],
    ['Mexico','MEX','B','🇲🇽'],['Ecuador','ECU','B','🇪🇨'],['Japan','JPN','B','🇯🇵'],['Scotland','SCO','B','🏴󠁧󠁢󠁳󠁣󠁴󠁿'],
    ['Canada','CAN','C','🇨🇦'],['Morocco','MAR','C','🇲🇦'],['Croatia','CRO','C','🇭🇷'],['Peru','PER','C','🇵🇪'],
    ['Argentina','ARG','D','🇦🇷'],['Nigeria','NGA','D','🇳🇬'],['Australia','AUS','D','🇦🇺'],['Wales','WAL','D','🏴󠁧󠁢󠁷󠁬󠁳󠁿'],
    ['Brazil','BRA','E','🇧🇷'],['Paraguay','PAR','E','🇵🇾'],['South Korea','KOR','E','🇰🇷'],['Tunisia','TUN','E','🇹🇳'],
    ['England','ENG','F','🏴󠁧󠁢󠁥󠁮󠁧󠁿'],['Netherlands','NED','F','🇳🇱'],['Iran','IRN','F','🇮🇷'],['Costa Rica','CRC','F','🇨🇷'],
    ['France','FRA','G','🇫🇷'],['Germany','GER','G','🇩🇪'],['Chile','CHI','G','🇨🇱'],['Cameroon','CMR','G','🇨🇲'],
    ['Spain','ESP','H','🇪🇸'],['Turkey','TUR','H','🇹🇷'],['China','CHN','H','🇨🇳'],['Panama','PAN','H','🇵🇦'],
    ['Portugal','POR','I','🇵🇹'],['Italy','ITA','I','🇮🇹'],['Saudi Arabia','SAU','I','🇸🇦'],['Honduras','HON','I','🇭🇳'],
    ['Belgium','BEL','J','🇧🇪'],['Switzerland','SUI','J','🇨🇭'],['Ghana','GHA','J','🇬🇭'],['Jamaica','JAM','J','🇯🇲'],
    ['Uruguay','URU','K','🇺🇾'],['Denmark','DEN','K','🇩🇰'],['Egypt','EGY','K','🇪🇬'],['Bolivia','BOL','K','🇧🇴'],
    ['Serbia','SRB','L','🇷🇸'],['Poland','POL','L','🇵🇱'],['Algeria','ALG','L','🇩🇿'],['Trinidad and Tobago','TTO','L','🇹🇹'],
  ];

  const teamIdByCode = {};
  teams.forEach(([name, code, group, flag], i) => {
    db.run('INSERT INTO teams (name, code, group_name, flag_emoji) VALUES (?, ?, ?, ?)', [name, code, group, flag]);
    teamIdByCode[code] = i + 1;
  });

  // ===== 10 MATCHES at Hard Rock Stadium =====
  const T = teamIdByCode;
  const matches = [
    [T.USA, T.COL, '2026-06-11T20:00:00', 'Hard Rock Stadium', 'Miami Gardens', 'group', 'A'],
    [T.MEX, T.ECU, '2026-06-12T17:00:00', 'Hard Rock Stadium', 'Miami Gardens', 'group', 'B'],
    [T.CAN, T.MAR, '2026-06-13T20:00:00', 'Hard Rock Stadium', 'Miami Gardens', 'group', 'C'],
    [T.ARG, T.NGA, '2026-06-14T17:00:00', 'Hard Rock Stadium', 'Miami Gardens', 'group', 'D'],
    [T.BRA, T.PAR, '2026-06-15T20:00:00', 'Hard Rock Stadium', 'Miami Gardens', 'group', 'E'],
    [T.ENG, T.NED, '2026-06-19T17:00:00', 'Hard Rock Stadium', 'Miami Gardens', 'group', 'F'],
    [T.FRA, T.GER, '2026-06-20T20:00:00', 'Hard Rock Stadium', 'Miami Gardens', 'group', 'G'],
    [T.ESP, T.TUR, '2026-06-22T17:00:00', 'Hard Rock Stadium', 'Miami Gardens', 'group', 'H'],
    [T.POR, T.ITA, '2026-06-25T20:00:00', 'Hard Rock Stadium', 'Miami Gardens', 'group', 'I'],
    [T.URU, T.DEN, '2026-07-02T17:00:00', 'Hard Rock Stadium', 'Miami Gardens', 'group', 'K'],
  ];
  matches.forEach(m => {
    db.run('INSERT INTO matches (home_team_id, away_team_id, kickoff_time, stadium, city, stage, group_name) VALUES (?,?,?,?,?,?,?)', m);
  });

  // ===== 20 VENUES across Miami =====
  // [name, type, address, city, lat, lng, phone, website, description, atmosphere, capacity, has_outdoor, has_food, drink_specials]
  const venues = [
    /*  1 */ ['The Brickell Tavern','bar','1020 9th St, Miami, FL 33130','Miami',25.763,-80.192,'(305) 555-0101','www.brickelltavern.com','Upscale sports bar in the heart of Brickell with 20+ HD screens and a craft beer wall.','lively,sports-focused,upscale,multiple-screens',180,0,1,'Happy hour 5-7pm, $5 draft beers during matches'],
    /*  2 */ ['The Rusty Anchor','bar','101 N Biscayne Blvd, Miami, FL 33132','Miami',25.773,-80.190,'(305) 555-0102','www.rustyanchor.com','Waterfront sports bar with bay views, premium sound, and a full seafood menu.','waterfront,upscale,full-restaurant',200,1,1,'Wing Wednesdays, $8 mojitos on match days'],
    /*  3 */ ['Brickell City Sports','bar','701 S Miami Ave, Miami, FL 33131','Miami',25.761,-80.193,'(305) 555-0103','www.brickellcitysports.com','Modern sports bar in the shopping center with projector walls and surround sound.','modern,multiple-screens,convenient',150,0,1,'Shopping + drinks package deals'],
    /*  4 */ ['Miami Bay Club','restaurant','401 Biscayne Blvd, Miami, FL 33132','Miami',25.768,-80.186,'(305) 555-0104','www.miamibayclub.com','Upscale waterfront restaurant with private screening rooms and prix fixe match menus.','fine-dining,waterfront,upscale',220,1,1,'Pre-match prix fixe menus starting $45'],
    /*  5 */ ['Brickell Social Lounge','bar','1200 S Miami Ave, Miami, FL 33130','Miami',25.760,-80.194,'(305) 555-0105','www.brickellsocial.com','Trendy lounge with craft cocktails, DJ sets at halftime, and an extensive TV wall.','trendy,cocktails,social,nightlife',140,0,1,'$8 craft cocktails during matches'],
    /*  6 */ ['The Mule Wynwood','bar','2610 N Miami Ave, Miami, FL 33127','Miami',25.801,-80.199,'(305) 555-0106','www.themule.com','Trendy Wynwood bar with a massive patio, street art, and HD screens.','trendy,outdoor-seating,artsy',120,1,1,'Free appetizers during matches, $6 margaritas'],
    /*  7 */ ['Wynwood Walls Cantina','bar','2925 NW 25th St, Miami, FL 33127','Miami',25.802,-80.201,'(305) 555-0107','www.wynwoodcantina.com','Street art-surrounded cantina serving Latin street food and craft cocktails.','artsy,cocktails,street-food,vibrant',100,1,1,'$3 tacos, $8 caguamas'],
    /*  8 */ ['Arsenal Alehouse','bar','2350 NW 2nd Ave, Miami, FL 33127','Miami',25.809,-80.207,'(305) 555-0108','www.arsenalalehouse.com','Industrial-chic craft beer bar with 30 rotating taps and a patio.','craft-beer,industrial-chic,outdoor,relaxed',110,1,1,'Flight specials, local brewery features'],
    /*  9 */ ['Wynwood Brewing Co.','bar','2410 N Miami Ave, Miami, FL 33127','Miami',25.799,-80.204,'(305) 555-0109','www.wynwoodbrewing.com','Microbrewery with taproom, beer garden, and giant outdoor projector screen.','brewery,outdoor,craft-beer,relaxed',200,1,1,'Brewery tours, flight tastings $12'],
    /* 10 */ ['South Beach Sports Lounge','bar','1435 Washington Ave, Miami Beach, FL 33139','Miami Beach',25.790,-80.130,'(305) 555-0110','www.sbsportslounge.com','High-energy South Beach sports bar with premium sound and a rooftop deck.','energetic,nightlife,multiple-screens',200,1,1,'Drink specials all match day'],
    /* 11 */ ['South Pointe Pier Pavilion','outdoor','1 Washington Ave, Miami Beach, FL 33139','Miami Beach',25.781,-80.128,'(305) 555-0111','www.southpointepier.com','Oceanfront outdoor screening pavilion — big screen, ocean breeze, sunset views.','oceanfront,outdoor,scenic,family-friendly',350,1,0,'BYOB welcome, food trucks on-site'],
    /* 12 */ ['Ocean Drive Watch Lounge','bar','1050 Ocean Dr, Miami Beach, FL 33139','Miami Beach',25.791,-80.131,'(305) 555-0112','www.oceandrivewatch.com','Beachfront bar with panoramic Atlantic views, tropical cocktails, and poolside seating.','oceanfront,upscale,nightlife,views',160,1,1,'Tropical cocktail specials'],
    /* 13 */ ['Little Havana Fan Zone','fan_zone','1500 SW 8th St, Miami, FL 33135','Miami',25.766,-80.219,'(305) 555-0113','www.littlehavanafanzone.com','Massive outdoor fan zone on Calle Ocho with giant LED screens, Cuban coffee, and live music.','family-friendly,community,outdoor,latin-culture',500,1,1,'Free Cuban coffee and pastries'],
    /* 14 */ ['Calle Ocho Sports Bar','bar','1000 SW 8th St, Miami, FL 33135','Miami',25.765,-80.219,'(305) 555-0114','www.calleochosports.com','Authentic Latin sports bar on Calle Ocho with dominos, cold cerveza, and croquetas.','latin-culture,authentic,casual,community',140,0,1,'$5 cerveza especial, fresh croquetas daily'],
    /* 15 */ ['El Vecino','restaurant','2108 NW 26th St, Miami, FL 33127','Miami',25.770,-80.218,'(305) 555-0115','www.elvecino-miami.com','Cozy Spanish restaurant with intimate bar, tapas, and wine pairings.','spanish-food,intimate,full-restaurant',95,0,1,'Tapas and wine match-day pairings'],
    /* 16 */ ['Coconut Grove Cinema','outdoor','2820 McFarlane Rd, Miami, FL 33133','Miami',25.727,-80.241,'(305) 555-0116','www.cocogrovecinema.com','Tropical outdoor screening with lawn seating, string lights, and food trucks.','outdoor,family-friendly,picnic-friendly,scenic',300,1,0,'BYOB, food trucks available'],
    /* 17 */ ['The Homestead Tavern','bar','3100 Commodore Plaza, Coconut Grove, FL 33133','Miami',25.725,-80.243,'(305) 555-0117','www.homesteadtavern.com','Laid-back neighborhood tavern with a loyal crowd, dart boards, and cold beer.','laid-back,casual,games,community',130,0,1,'Happy hour all day Sunday'],
    /* 18 */ ['Coral Gables Country Club','restaurant','1 Country Club Ln, Coral Gables, FL 33134','Coral Gables',25.750,-80.265,'(305) 555-0118','www.coralgablescc.com','Elegant country club with private screening rooms and fine dining.','upscale,private,elegant,full-restaurant',160,1,1,'Members and guests welcome'],
    /* 19 */ ['Gables Gastropub','restaurant','123 Miracle Mile, Coral Gables, FL 33134','Coral Gables',25.746,-80.270,'(305) 555-0119','www.gablesgastropub.com','Upscale gastropub with craft beer wall, gourmet burgers, and match-day chef specials.','gastropub,upscale,craft-beer,full-restaurant',120,0,1,'Chef specials during matches'],
    /* 20 */ ['Doral Sports Complex','fan_zone','8300 NW 36th St, Doral, FL 33166','Doral',25.812,-80.347,'(305) 555-0120','www.doralsports.com','Massive sports complex with outdoor fields, giant screens, and family activities.','family-friendly,outdoor,spacious,multi-sport',400,1,1,'Food trucks, free parking'],
  ];
  venues.forEach(v => {
    db.run(
      'INSERT INTO venues (name,type,address,city,lat,lng,phone,website,description,atmosphere,capacity,has_outdoor,has_food,drink_specials) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      v
    );
  });

  // ===== 20 EVENTS =====
  // [venue_id, match_id, title, description, team_affiliation, organizer_name, max_capacity, rsvp_count]
  const events = [
    [1,  1, 'American Outlaws Miami — USA vs Colombia','The official American Outlaws chapter watch party. Expect USA chants, smoke, and pure energy!','USA','American Outlaws Miami',120,67],
    [13, 1, 'USA vs Colombia — Little Havana Fan Zone','Massive community watch party with Colombian food specials, live DJ, and giant screens.', null,'Miami Community Events',400,185],
    [5,  2, 'Mexico Watch Party — Brickell Social','Mexican supporters gathering with tequila specials and mariachi at halftime.','Mexico','Mexico Supporters Network',100,52],
    [10, 2, 'Mexico vs Ecuador — South Beach Edition','High-energy South Beach viewing with rooftop access and Caribbean cocktails.', null,'South Beach Sports Inc',180,73],
    [9,  3, 'Canada Watch Party — Wynwood Brewing','Canadian supporters welcome! Craft beer flights and poutine specials.','Canada','Maple Leaf Supporters Club',110,38],
    [3,  3, 'Morocco Fans — Brickell Celebration','Moroccan community gathering with traditional mint tea and couscous.','Morocco','Morocco Pride Miami',130,44],
    [2,  4, 'Argentina Watch Party — Waterfront','Waterfront Argentine experience with asado, Malbec, and Messi jerseys everywhere.','Argentina','Tango Sports Events',150,89],
    [17, 4, 'Nigeria Supporters at Coconut Grove','Celebrating Super Eagles football with jollof rice and Afrobeat.','Nigeria','Nigerian Diaspora Events',90,31],
    [16, 5, 'Brazil Fiesta — Outdoor Cinema','Samba, caipirinha, and Brazilian football under the stars. Bring a blanket!','Brazil','Samba Sports Miami',250,112],
    [7,  5, 'Brazil vs Paraguay — Wynwood Watch','Premium viewing in artsy Wynwood with Brazilian street food and craft cocktails.', null,'Miami Premium Events',100,41],
    [10, 6, 'Three Lions — South Beach','England supporters gather for proper football with pints and pie.','England','Three Lions Miami',120,56],
    [19, 6, 'Netherlands Watch Party — Gables Gastropub','Dutch supporters in orange with European beer selection and bitterballen.','Netherlands','Oranje Supporters Club',95,29],
    [4,  7, 'France Watch Party — Fine Dining','French cuisine and natural wines paired with Les Bleus on the big screen.','France','Franco-American Society',160,48],
    [8,  7, 'Germany Supporters — Arsenal Alehouse','German craft beer lovers unite. Bratwurst, pretzels, and 30 taps.','Germany','German Sports Club Miami',85,37],
    [14, 8, 'Spain Watch Party — Calle Ocho','La Roja supporters gathering with sangria, paella, and Latin flair.','Spain','Spanish Supporters Miami',125,55],
    [12, 8, 'Turkey vs Spain — Ocean Drive','Beachfront viewing with a mixed international crowd and sunset cocktails.', null,'Miami Beach Events',140,62],
    [20, 9, 'Portugal Watch Party — Doral','Portuguese community gathering with giant outdoor screens and bacalhau.','Portugal','Portuguese Heritage Alliance',300,78],
    [18, 9, 'Italy vs Portugal — Country Club','Elegant Italian supporter event with antipasto, wine, and private screening rooms.','Italy','Italian Sports Federation Miami',130,43],
    [7, 10, 'Uruguay Watch Party — Wynwood','Uruguayan supporters celebration with chivito and mate.','Uruguay','Uruguay Forever Miami',80,26],
    [16,10, 'Denmark Supporters — Coconut Grove','Scandinavian supporters gathering under the palms. Casual and chill.','Denmark','Scandinavian Sports Club',75,22],
  ];
  events.forEach(e => {
    db.run(
      'INSERT INTO events (venue_id,match_id,title,description,team_affiliation,organizer_name,max_capacity,rsvp_count) VALUES (?,?,?,?,?,?,?,?)',
      e
    );
  });

  // ===== SAMPLE RSVPs =====
  const names = ['Alex Johnson','Maria Garcia','James Smith','Sofia Rodriguez','Michael Chen','Emma Wilson','Carlos Lopez','Anna Kowalski','David Thompson','Lisa Anderson'];
  for (let eventId = 1; eventId <= 10; eventId++) {
    for (let i = 0; i < 3; i++) {
      db.run('INSERT INTO rsvps (event_id, name, email) VALUES (?, ?, ?)', [
        eventId,
        names[(eventId + i) % names.length],
        `fan${eventId}${i}@example.com`
      ]);
    }
  }
};
