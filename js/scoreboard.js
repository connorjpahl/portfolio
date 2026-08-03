// Cardinals Minor League Scoreboard
// Pulls live game data for each affiliate from the public MLB Stats API
// (https://statsapi.mlb.com) - no API key required.

const CARDINALS_AFFILIATES = [
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

let autoRefreshTimer = null;

// MLB's API expects a local calendar date, e.g. "2026-08-02"
function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function renderNoGameCard(team) {
  return `
    <div class="col-md-6 col-lg-3">
      <div class="card scoreboard-card h-100">
        <div class="card-body text-center">
          <span class="badge bg-secondary mb-2">${team.level}</span>
          <h5 class="card-title">${team.name}</h5>
          <p class="text-muted mb-0 mt-3">No game scheduled today</p>
        </div>
      </div>
    </div>
  `;
}

function renderErrorCard(team) {
  return `
    <div class="col-md-6 col-lg-3">
      <div class="card scoreboard-card h-100">
        <div class="card-body text-center">
          <span class="badge bg-secondary mb-2">${team.level}</span>
          <h5 class="card-title">${team.name}</h5>
          <p class="text-danger mb-0 mt-3">Couldn't load game data</p>
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

function renderGameCard(team, game) {
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
        </div>
      </div>
    </div>
  `;
}

async function loadScoreboard() {
  refreshBtn.disabled = true;

  const cards = await Promise.all(
    CARDINALS_AFFILIATES.map(async (team) => {
      try {
        const game = await fetchTeamGame(team);
        return game ? renderGameCard(team, game) : renderNoGameCard(team);
      } catch (err) {
        console.error(`Error loading ${team.name}:`, err);
        return renderErrorCard(team);
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

scoreboardGrid.addEventListener('click', (event) => handleCardActivate(event.target));

scoreboardGrid.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handleCardActivate(event.target);
  }
});

refreshBtn.addEventListener('click', loadScoreboard);

loadScoreboard();
scheduleAutoRefresh();
