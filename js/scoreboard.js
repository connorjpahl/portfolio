// Cardinals Organization Scoreboard
// Pulls live game data for the big-league club and each minor league affiliate
// from the public MLB Stats API (https://statsapi.mlb.com) - no API key required.

const CARDINALS_AFFILIATES = [
  { name: 'St. Louis Cardinals', level: 'MLB', sportId: 1, teamId: 138 },
  { name: 'Memphis Redbirds', level: 'Triple-A', sportId: 11, teamId: 235 },
  { name: 'Springfield Cardinals', level: 'Double-A', sportId: 12, teamId: 440 },
  { name: 'Peoria Chiefs', level: 'High-A', sportId: 13, teamId: 443 },
  { name: 'Palm Beach Cardinals', level: 'Single-A', sportId: 14, teamId: 279 },
];

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';
const AUTO_REFRESH_MS = 30000;

const scoreboardGrid = document.getElementById('scoreboardGrid');
const scoreboardUpdated = document.getElementById('scoreboardUpdated');
const refreshBtn = document.getElementById('refreshScoreboard');
const boxscoreModalBody = document.getElementById('boxscoreModalBody');
const boxscoreModalLabel = document.getElementById('boxscoreModalLabel');
const boxscoreModal = new bootstrap.Modal(document.getElementById('boxscoreModal'));
const scheduleModalBody = document.getElementById('scheduleModalBody');
const scheduleModalLabel = document.getElementById('scheduleModalLabel');
const scheduleModal = new bootstrap.Modal(document.getElementById('scheduleModal'));

const SEASON_YEAR = new Date().getFullYear();

let autoRefreshTimer = null;

// MLB's API expects a local calendar date, e.g. "2026-08-02"
function dateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayDateString() {
  return dateString(new Date());
}

async function fetchTeamGame(team) {
  const date = todayDateString();
  const url = `${MLB_API_BASE}/schedule?sportId=${team.sportId}&teamId=${team.teamId}&date=${date}&hydrate=linescore`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MLB API request failed (${response.status})`);
  }

  const data = await response.json();
  const games = data.dates?.[0]?.games ?? [];
  return games[0] || null; // most affiliates play one game per day
}

function scheduleButton(teamIndex) {
  return `<button type="button" class="btn btn-outline-secondary btn-sm scoreboard-schedule-btn mt-3" data-team-index="${teamIndex}">Schedule</button>`;
}

function renderNoGameCard(team, teamIndex) {
  return `
    <div class="col-md-6 col-lg-3">
      <div class="card scoreboard-card h-100">
        <div class="card-body text-center">
          <span class="badge bg-secondary mb-2">${team.level}</span>
          <h5 class="card-title">${team.name}</h5>
          <p class="text-muted mb-0 mt-3">No game scheduled today</p>
          ${scheduleButton(teamIndex)}
        </div>
      </div>
    </div>
  `;
}

function renderErrorCard(team, teamIndex) {
  return `
    <div class="col-md-6 col-lg-3">
      <div class="card scoreboard-card h-100">
        <div class="card-body text-center">
          <span class="badge bg-secondary mb-2">${team.level}</span>
          <h5 class="card-title">${team.name}</h5>
          <p class="text-danger mb-0 mt-3">Couldn't load game data</p>
          ${scheduleButton(teamIndex)}
        </div>
      </div>
    </div>
  `;
}

function statusBadge(abstractState, detailedState) {
  if (abstractState === 'Live') {
    return `<span class="badge bg-danger scoreboard-live-badge">${detailedState}</span>`;
  }
  if (abstractState === 'Final') {
    return `<span class="badge bg-dark">${detailedState}</span>`;
  }
  return `<span class="badge bg-secondary">${detailedState}</span>`;
}

function renderGameCard(team, game, teamIndex) {
  const away = game.teams.away;
  const home = game.teams.home;
  const abstractState = game.status.abstractGameState;
  const detailedState = game.status.detailedState;

  const inningLine = game.linescore?.currentInningOrdinal
    ? `${game.linescore.inningState || ''} ${game.linescore.currentInningOrdinal}`.trim()
    : '';

  return `
    <div class="col-md-6 col-lg-3">
      <div class="card scoreboard-card scoreboard-card-clickable h-100" data-game-pk="${game.gamePk}" role="button" tabindex="0">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <span class="badge bg-secondary">${team.level}</span>
            ${statusBadge(abstractState, detailedState)}
          </div>
          <h5 class="card-title mb-3">${team.name}</h5>
          <div class="d-flex justify-content-between">
            <span>${away.team.name}</span>
            <span class="fw-bold">${away.score ?? '-'}</span>
          </div>
          <div class="d-flex justify-content-between">
            <span>${home.team.name}</span>
            <span class="fw-bold">${home.score ?? '-'}</span>
          </div>
          ${inningLine ? `<p class="text-muted small mt-2 mb-0">${inningLine}</p>` : ''}
          <p class="text-primary small mt-2 mb-0">View box score &rarr;</p>
          ${scheduleButton(teamIndex)}
        </div>
      </div>
    </div>
  `;
}

async function loadScoreboard() {
  refreshBtn.disabled = true;

  const cards = await Promise.all(
    CARDINALS_AFFILIATES.map(async (team, teamIndex) => {
      try {
        const game = await fetchTeamGame(team);
        return game ? renderGameCard(team, game, teamIndex) : renderNoGameCard(team, teamIndex);
      } catch (err) {
        console.error(`Error loading ${team.name}:`, err);
        return renderErrorCard(team, teamIndex);
      }
    })
  );

  scoreboardGrid.innerHTML = cards.join('');
  scoreboardUpdated.textContent = `Last updated ${new Date().toLocaleTimeString()}`;
  refreshBtn.disabled = false;
}

function scheduleAutoRefresh() {
  clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(loadScoreboard, AUTO_REFRESH_MS);
}

// ---------- Box score modal ----------

function battingTableRows(team) {
  return (team.batters || [])
    .map((id) => team.players[`ID${id}`])
    .filter((player) => player?.stats?.batting && player.stats.batting.plateAppearances > 0)
    .map((player) => {
      const b = player.stats.batting;
      const season = player.seasonStats?.batting;
      return `
        <tr>
          <td>${player.person.boxscoreName}</td>
          <td>${player.position.abbreviation}</td>
          <td>${b.atBats}</td>
          <td>${b.runs}</td>
          <td>${b.hits}</td>
          <td>${b.rbi}</td>
          <td>${b.baseOnBalls}</td>
          <td>${b.strikeOuts}</td>
          <td>${season?.avg ?? '-'}</td>
          <td>${season?.obp ?? '-'}</td>
          <td>${season?.slg ?? '-'}</td>
          <td>${season?.ops ?? '-'}</td>
        </tr>
      `;
    })
    .join('');
}

function pitchingTableRows(team) {
  return (team.pitchers || [])
    .map((id) => team.players[`ID${id}`])
    .filter((player) => player?.stats?.pitching)
    .map((player) => {
      const p = player.stats.pitching;
      const season = player.seasonStats?.pitching;
      const decision = p.note ? ` <span class="text-muted">${p.note}</span>` : '';
      return `
        <tr>
          <td>${player.person.boxscoreName}${decision}</td>
          <td>${p.inningsPitched}</td>
          <td>${p.hits}</td>
          <td>${p.runs}</td>
          <td>${p.earnedRuns}</td>
          <td>${p.baseOnBalls}</td>
          <td>${p.strikeOuts}</td>
          <td>${season?.era ?? '-'}</td>
          <td>${season?.whip ?? '-'}</td>
        </tr>
      `;
    })
    .join('');
}

function teamBoxscoreSection(team) {
  return `
    <h5 class="mt-3">${team.team.name}</h5>
    <h6 class="text-muted">Batting</h6>
    <p class="text-muted small mb-1">Game stats, plus each player's season-long AVG / OBP / SLG / OPS</p>
    <div class="table-responsive mb-3">
      <table class="table table-sm table-striped">
        <thead>
          <tr>
            <th>Player</th><th>Pos</th><th>AB</th><th>R</th><th>H</th><th>RBI</th><th>BB</th><th>SO</th>
            <th>AVG</th><th>OBP</th><th>SLG</th><th>OPS</th>
          </tr>
        </thead>
        <tbody>${battingTableRows(team)}</tbody>
      </table>
    </div>
    <h6 class="text-muted">Pitching</h6>
    <p class="text-muted small mb-1">Game stats, plus each player's season-long ERA / WHIP</p>
    <div class="table-responsive mb-4">
      <table class="table table-sm table-striped">
        <thead>
          <tr><th>Player</th><th>IP</th><th>H</th><th>R</th><th>ER</th><th>BB</th><th>SO</th><th>ERA</th><th>WHIP</th></tr>
        </thead>
        <tbody>${pitchingTableRows(team)}</tbody>
      </table>
    </div>
  `;
}

function renderBoxscore(data) {
  return `
    <div class="row">
      <div class="col-md-6">${teamBoxscoreSection(data.teams.away)}</div>
      <div class="col-md-6">${teamBoxscoreSection(data.teams.home)}</div>
    </div>
  `;
}

async function openBoxscore(gamePk, titleHint) {
  boxscoreModalLabel.textContent = titleHint || 'Box Score';
  boxscoreModalBody.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `;
  boxscoreModal.show();

  try {
    const response = await fetch(`${MLB_API_BASE}/game/${gamePk}/boxscore`);
    if (!response.ok) {
      throw new Error(`MLB API request failed (${response.status})`);
    }
    const data = await response.json();
    boxscoreModalLabel.textContent = `${data.teams.away.team.name} @ ${data.teams.home.team.name}`;
    boxscoreModalBody.innerHTML = renderBoxscore(data);
  } catch (err) {
    console.error('Error loading box score:', err);
    boxscoreModalBody.innerHTML = `<p class="text-danger text-center py-5">Couldn't load the box score. Please try again.</p>`;
  }
}

function handleCardActivate(target) {
  const card = target.closest('.scoreboard-card-clickable');
  if (!card) return;
  const gamePk = card.dataset.gamePk;
  const teamName = card.querySelector('.card-title')?.textContent;
  openBoxscore(gamePk, teamName);
}

// ---------- Schedule modal ----------

function formatScheduleDate(gameDate) {
  return new Date(gameDate).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatScheduleTime(gameDate) {
  return new Date(gameDate).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// MLB's API marks postponed/suspended/cancelled games as abstractGameState
// "Final" too, but with no score - so a real final score needs both checked.
function hasFinalScore(game) {
  return (
    game.status.abstractGameState === 'Final' &&
    game.teams.away.score != null &&
    game.teams.home.score != null
  );
}

function scheduleResultCell(game, teamId) {
  const away = game.teams.away;
  const home = game.teams.home;
  const teamSide = away.team.id === teamId ? away : home;
  const oppSide = away.team.id === teamId ? home : away;

  if (hasFinalScore(game)) {
    return `${teamSide.isWinner ? 'W' : 'L'} ${teamSide.score}-${oppSide.score}`;
  }
  if (game.status.abstractGameState === 'Final') {
    return game.status.detailedState; // Postponed, Suspended, Cancelled, etc.
  }
  if (game.status.abstractGameState === 'Live') {
    return 'Live';
  }
  return formatScheduleTime(game.gameDate);
}

function scheduleTableRows(games, teamId) {
  const today = todayDateString();
  return games
    .map((game) => {
      const away = game.teams.away;
      const home = game.teams.home;
      const isHome = home.team.id === teamId;
      const opponent = isHome ? away.team.name : home.team.name;
      const isToday = dateString(new Date(game.gameDate)) === today;
      const isFinal = hasFinalScore(game);

      const rowClass = [isToday ? 'table-primary' : '', isFinal ? 'scoreboard-schedule-row' : '']
        .filter(Boolean)
        .join(' ');
      const rowAttrs = isFinal
        ? `class="${rowClass}" data-game-pk="${game.gamePk}" data-matchup="${isHome ? 'vs' : '@'} ${opponent}" role="button" tabindex="0"`
        : `class="${rowClass}"`;

      return `
        <tr ${rowAttrs}${isToday ? ' id="scheduleTodayRow"' : ''}>
          <td>${formatScheduleDate(game.gameDate)}${isToday ? ' <span class="badge bg-primary">Today</span>' : ''}</td>
          <td>${isHome ? 'vs' : '@'} ${opponent}</td>
          <td>${scheduleResultCell(game, teamId)}</td>
        </tr>
      `;
    })
    .join('');
}

async function fetchTeamSchedule(team) {
  const startDate = `${SEASON_YEAR}-01-01`;
  const endDate = `${SEASON_YEAR}-12-31`;
  const url = `${MLB_API_BASE}/schedule?sportId=${team.sportId}&teamId=${team.teamId}&startDate=${startDate}&endDate=${endDate}&gameType=R`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MLB API request failed (${response.status})`);
  }

  const data = await response.json();
  return (data.dates || []).flatMap((d) => d.games);
}

async function openSchedule(team) {
  scheduleModalLabel.textContent = `${team.name} Schedule`;
  scheduleModalBody.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `;
  scheduleModal.show();

  try {
    const games = await fetchTeamSchedule(team);
    if (games.length === 0) {
      scheduleModalBody.innerHTML = `<p class="text-muted text-center py-5">No games found in this date range.</p>`;
      return;
    }
    scheduleModalBody.innerHTML = `
      <p class="text-muted small">Completed games are clickable for the full box score.</p>
      <div class="table-responsive">
        <table class="table table-sm table-striped">
          <thead>
            <tr><th>Date</th><th>Matchup</th><th>Result / Time</th></tr>
          </thead>
          <tbody>${scheduleTableRows(games, team.teamId)}</tbody>
        </table>
      </div>
    `;
    document.getElementById('scheduleTodayRow')?.scrollIntoView({ block: 'center' });
  } catch (err) {
    console.error(`Error loading schedule for ${team.name}:`, err);
    scheduleModalBody.innerHTML = `<p class="text-danger text-center py-5">Couldn't load the schedule. Please try again.</p>`;
  }
}

function handleGridClick(event) {
  const scheduleBtn = event.target.closest('.scoreboard-schedule-btn');
  if (scheduleBtn) {
    const team = CARDINALS_AFFILIATES[Number(scheduleBtn.dataset.teamIndex)];
    openSchedule(team);
    return;
  }
  handleCardActivate(event.target);
}

scoreboardGrid.addEventListener('click', handleGridClick);

scoreboardGrid.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  // Let the schedule <button> handle its own native Enter/Space activation.
  if (event.target.closest('.scoreboard-schedule-btn')) return;
  if (!event.target.closest('.scoreboard-card-clickable')) return;
  event.preventDefault();
  handleGridClick(event);
});

function handleScheduleRowActivate(target) {
  const row = target.closest('.scoreboard-schedule-row');
  if (!row) return;
  const { gamePk, matchup } = row.dataset;

  // Close the schedule modal first, then open the box score once it's fully hidden -
  // avoids stacking two Bootstrap modals/backdrops on top of each other.
  const scheduleModalEl = document.getElementById('scheduleModal');
  scheduleModalEl.addEventListener(
    'hidden.bs.modal',
    () => openBoxscore(gamePk, matchup),
    { once: true }
  );
  scheduleModal.hide();
}

scheduleModalBody.addEventListener('click', (event) => handleScheduleRowActivate(event.target));

scheduleModalBody.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (!event.target.closest('.scoreboard-schedule-row')) return;
  event.preventDefault();
  handleScheduleRowActivate(event.target);
});

refreshBtn.addEventListener('click', loadScoreboard);

loadScoreboard();
scheduleAutoRefresh();
