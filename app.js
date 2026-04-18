// ============================================================
// Badminton Manager - Main Application
// ============================================================

import CONFIG from "./config.js";

// ============================================================
// Supabase Client Setup
// ============================================================

const { createClient } = supabase;
const supabaseClient = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY,
);

// ============================================================
// State Management
// ============================================================

const state = {
  players: [],
  matches: [],
  selectedPlayers: [],
  generatedTeams: [],
};

// ============================================================
// Utility Functions
// ============================================================

// Show loading overlay
function showLoading() {
  document.getElementById("loading-overlay").style.display = "flex";
}

// Hide loading overlay
function hideLoading() {
  document.getElementById("loading-overlay").style.display = "none";
}

// Show toast notification
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icon =
    {
      success: "✓",
      error: "✗",
      warning: "⚠",
      info: "ℹ",
    }[type] || "ℹ";

  toast.innerHTML = `<span>${icon}</span> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s ease reverse";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================
// Navigation
// ============================================================

function initNavigation() {
  const menuItems = document.querySelectorAll(".menu-item");
  const pages = document.querySelectorAll(".page");

  menuItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const targetPage = item.dataset.page;

      // Update active menu item
      menuItems.forEach((mi) => mi.classList.remove("active"));
      item.classList.add("active");

      // Show target page
      pages.forEach((page) => page.classList.remove("active"));
      document.getElementById(`page-${targetPage}`).classList.add("active");

      // Load page data
      loadPageData(targetPage);
    });
  });
}

function loadPageData(pageName) {
  switch (pageName) {
    case "leaderboard":
      loadLeaderboard();
      break;
    case "players":
      loadPlayers();
      break;
    case "teams":
      loadPlayersForTeamSelection();
      break;
    case "matches":
      loadMatches();
      loadPlayersForMatchForm();
      break;
  }
}

// ============================================================
// Player Management
// ============================================================

async function loadPlayers() {
  showLoading();

  try {
    const { data, error } = await supabaseClient
      .from("players")
      .select("*")
      .order("name");

    if (error) throw error;

    state.players = data;
    renderPlayers();
  } catch (error) {
    console.error("Error loading players:", error);
    showToast("Failed to load players", "error");
  } finally {
    hideLoading();
  }
}

function renderPlayers() {
  const container = document.getElementById("players-list");

  if (state.players.length === 0) {
    container.innerHTML =
      '<p class="text-muted">No players added yet. Add your first player above!</p>';
    return;
  }

  container.innerHTML = state.players
    .map(
      (player) => `
    <div class="player-card">
      <span class="player-name">${player.name}</span>
      <div class="player-actions">
        <button class="btn btn-danger btn-small" onclick="deletePlayer('${player.id}')">
          Delete
        </button>
      </div>
    </div>
  `,
    )
    .join("");
}

async function addPlayer(e) {
  e.preventDefault();

  const nameInput = document.getElementById("player-name");
  const name = nameInput.value.trim();

  if (!name) {
    showToast("Please enter a player name", "warning");
    return;
  }

  showLoading();

  try {
    const { data, error } = await supabaseClient
      .from("players")
      .insert([{ name }])
      .select();

    if (error) throw error;

    showToast("Player added successfully!", "success");
    nameInput.value = "";
    loadPlayers();
  } catch (error) {
    console.error("Error adding player:", error);
    showToast("Failed to add player", "error");
    hideLoading();
  }
}

async function deletePlayer(playerId) {
  if (
    !confirm(
      "Are you sure you want to delete this player? This will also delete all their match records.",
    )
  ) {
    return;
  }

  showLoading();

  try {
    const { error } = await supabaseClient
      .from("players")
      .delete()
      .eq("id", playerId);

    if (error) throw error;

    showToast("Player deleted successfully", "success");
    loadPlayers();
  } catch (error) {
    console.error("Error deleting player:", error);
    showToast("Failed to delete player", "error");
    hideLoading();
  }
}

// Make deletePlayer globally available
window.deletePlayer = deletePlayer;

// ============================================================
// Team Generation
// ============================================================

async function loadPlayersForTeamSelection() {
  showLoading();

  try {
    const { data, error } = await supabaseClient
      .from("players")
      .select("*")
      .order("name");

    if (error) throw error;

    state.players = data;
    renderPlayerSelection();
  } catch (error) {
    console.error("Error loading players:", error);
    showToast("Failed to load players", "error");
  } finally {
    hideLoading();
  }
}

function renderPlayerSelection() {
  const container = document.getElementById("player-selection");

  if (state.players.length === 0) {
    container.innerHTML =
      '<p class="text-muted">No players available. Add players first!</p>';
    return;
  }

  container.innerHTML = state.players
    .map(
      (player) => `
    <div class="player-checkbox" id="checkbox-${player.id}">
      <input 
        type="checkbox" 
        id="player-${player.id}" 
        value="${player.id}"
        onchange="togglePlayerSelection('${player.id}')"
      >
      <label for="player-${player.id}">${player.name}</label>
    </div>
  `,
    )
    .join("");
}

function togglePlayerSelection(playerId) {
  const checkbox = document.getElementById(`player-${playerId}`);
  const container = document.getElementById(`checkbox-${playerId}`);

  if (checkbox.checked) {
    state.selectedPlayers.push(playerId);
    container.classList.add("selected");
  } else {
    state.selectedPlayers = state.selectedPlayers.filter(
      (id) => id !== playerId,
    );
    container.classList.remove("selected");
  }
}

function generateRandomTeams() {
  if (state.selectedPlayers.length < 4) {
    showToast("Please select at least 4 players", "warning");
    return;
  }

  if (state.selectedPlayers.length % 2 !== 0) {
    showToast("Please select an even number of players", "warning");
    return;
  }

  // Shuffle selected players
  const shuffled = shuffleArray(state.selectedPlayers);

  // Create teams (2 players per team)
  state.generatedTeams = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    state.generatedTeams.push([shuffled[i], shuffled[i + 1]]);
  }

  renderGeneratedTeams();
  showToast("Teams generated successfully!", "success");
}

function renderGeneratedTeams() {
  const container = document.getElementById("teams-display");
  const section = document.getElementById("generated-teams");

  section.style.display = "block";

  container.innerHTML = state.generatedTeams
    .map((team, index) => {
      const player1 = state.players.find((p) => p.id === team[0]);
      const player2 = state.players.find((p) => p.id === team[1]);

      return `
      <div class="team-card">
        <div class="team-header">
          🏸 Team ${index + 1}
        </div>
        <div class="team-players">
          <div class="player">${player1?.name || "Unknown"}</div>
          <div class="player">${player2?.name || "Unknown"}</div>
        </div>
      </div>
    `;
    })
    .join("");
}

// Make functions globally available
window.togglePlayerSelection = togglePlayerSelection;
window.generateRandomTeams = generateRandomTeams;

// ============================================================
// Match Management
// ============================================================

async function loadPlayersForMatchForm() {
  try {
    const { data, error } = await supabaseClient
      .from("players")
      .select("*")
      .order("name");

    if (error) throw error;

    state.players = data;
    populatePlayerSelects();
  } catch (error) {
    console.error("Error loading players:", error);
  }
}

function populatePlayerSelects() {
  const selectIds = [
    "team1-player1",
    "team1-player2",
    "team2-player1",
    "team2-player2",
  ];

  const options = state.players
    .map((player) => `<option value="${player.id}">${player.name}</option>`)
    .join("");

  selectIds.forEach((id) => {
    const select = document.getElementById(id);
    const currentValue = select.value;
    select.innerHTML = '<option value="">Select player</option>' + options;
    if (currentValue) {
      select.value = currentValue;
    }
  });
}

async function addMatch(e) {
  e.preventDefault();

  const matchDate = document.getElementById("match-date").value;
  const team1Player1 = document.getElementById("team1-player1").value;
  const team1Player2 = document.getElementById("team1-player2").value;
  const team1Score = parseInt(document.getElementById("team1-score").value);
  const team2Player1 = document.getElementById("team2-player1").value;
  const team2Player2 = document.getElementById("team2-player2").value;
  const team2Score = parseInt(document.getElementById("team2-score").value);

  // Validation
  const playerIds = [team1Player1, team1Player2, team2Player1, team2Player2];
  if (new Set(playerIds).size !== 4) {
    showToast("Each player can only be selected once per match", "error");
    return;
  }

  if (team1Score < 0 || team2Score < 0) {
    showToast("Scores must be positive numbers", "error");
    return;
  }

  showLoading();

  try {
    const { data, error } = await supabaseClient
      .from("matches")
      .insert([
        {
          match_date: matchDate,
          team1_player1_id: team1Player1,
          team1_player2_id: team1Player2,
          team1_score: team1Score,
          team2_player1_id: team2Player1,
          team2_player2_id: team2Player2,
          team2_score: team2Score,
        },
      ])
      .select();

    if (error) throw error;

    showToast("Match saved successfully!", "success");
    document.getElementById("add-match-form").reset();

    // Set default date to today
    document.getElementById("match-date").valueAsDate = new Date();

    loadMatches();
  } catch (error) {
    console.error("Error saving match:", error);
    showToast("Failed to save match", "error");
    hideLoading();
  }
}

async function loadMatches() {
  showLoading();

  try {
    const { data, error } = await supabaseClient
      .from("matches")
      .select(
        `
        *,
        team1_player1:players!matches_team1_player1_id_fkey(name),
        team1_player2:players!matches_team1_player2_id_fkey(name),
        team2_player1:players!matches_team2_player1_id_fkey(name),
        team2_player2:players!matches_team2_player2_id_fkey(name)
      `,
      )
      .order("match_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    state.matches = data;
    renderMatches();
  } catch (error) {
    console.error("Error loading matches:", error);
    showToast("Failed to load matches", "error");
  } finally {
    hideLoading();
  }
}

function renderMatches() {
  const container = document.getElementById("matches-list");

  if (state.matches.length === 0) {
    container.innerHTML = '<p class="text-muted">No matches recorded yet.</p>';
    return;
  }

  container.innerHTML = state.matches
    .map((match) => {
      const team1Won = match.team1_score > match.team2_score;

      return `
      <div class="match-card">
        <div class="match-date">📅 ${formatDate(match.match_date)}</div>
        <div class="match-teams">
          <div class="team">
            <div class="team-name">Team 1</div>
            <div class="players">
              ${match.team1_player1?.name || "Unknown"} & ${match.team1_player2?.name || "Unknown"}
            </div>
            <div class="score ${team1Won ? "winner" : "loser"}">
              ${match.team1_score}
            </div>
          </div>
          <div class="vs">VS</div>
          <div class="team">
            <div class="team-name">Team 2</div>
            <div class="players">
              ${match.team2_player1?.name || "Unknown"} & ${match.team2_player2?.name || "Unknown"}
            </div>
            <div class="score ${!team1Won ? "winner" : "loser"}">
              ${match.team2_score}
            </div>
          </div>
        </div>
        <div class="match-actions">
          <button class="btn btn-danger btn-small" onclick="deleteMatch('${match.id}')">
            Delete
          </button>
        </div>
      </div>
    `;
    })
    .join("");
}

async function deleteMatch(matchId) {
  if (!confirm("Are you sure you want to delete this match?")) {
    return;
  }

  showLoading();

  try {
    const { error } = await supabaseClient
      .from("matches")
      .delete()
      .eq("id", matchId);

    if (error) throw error;

    showToast("Match deleted successfully", "success");
    loadMatches();
  } catch (error) {
    console.error("Error deleting match:", error);
    showToast("Failed to delete match", "error");
    hideLoading();
  }
}

// Make deleteMatch globally available
window.deleteMatch = deleteMatch;

// ============================================================
// Leaderboard
// ============================================================

async function loadLeaderboard() {
  showLoading();

  try {
    // Load all data
    const [playersResult, matchesResult] = await Promise.all([
      supabaseClient.from("players").select("*"),
      supabaseClient.from("matches").select("*"),
    ]);

    if (playersResult.error) throw playersResult.error;
    if (matchesResult.error) throw matchesResult.error;

    state.players = playersResult.data;
    state.matches = matchesResult.data;

    calculateAndRenderLeaderboards();
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    showToast("Failed to load leaderboard", "error");
  } finally {
    hideLoading();
  }
}

function calculatePlayerStats() {
  const stats = {};

  // Initialize stats for all players
  state.players.forEach((player) => {
    stats[player.id] = {
      id: player.id,
      name: player.name,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    };
  });

  // Calculate stats from matches
  state.matches.forEach((match) => {
    const team1Won = match.team1_score > match.team2_score;

    // Team 1 players
    [match.team1_player1_id, match.team1_player2_id].forEach((playerId) => {
      if (stats[playerId]) {
        if (team1Won) stats[playerId].wins++;
        else stats[playerId].losses++;
        stats[playerId].pointsFor += match.team1_score;
        stats[playerId].pointsAgainst += match.team2_score;
      }
    });

    // Team 2 players
    [match.team2_player1_id, match.team2_player2_id].forEach((playerId) => {
      if (stats[playerId]) {
        if (!team1Won) stats[playerId].wins++;
        else stats[playerId].losses++;
        stats[playerId].pointsFor += match.team2_score;
        stats[playerId].pointsAgainst += match.team1_score;
      }
    });
  });

  // Convert to array and calculate win rate
  return Object.values(stats)
    .map((player) => ({
      ...player,
      totalMatches: player.wins + player.losses,
      winRate:
        player.wins + player.losses > 0
          ? ((player.wins / (player.wins + player.losses)) * 100).toFixed(1)
          : 0,
    }))
    .sort((a, b) => {
      // Sort by wins first, then win rate
      if (b.wins !== a.wins) return b.wins - a.wins;
      return parseFloat(b.winRate) - parseFloat(a.winRate);
    });
}

function calculateTeamStats() {
  const teamStats = {};

  state.matches.forEach((match) => {
    // Create team keys (sorted player IDs to ensure consistency)
    const team1Key = [match.team1_player1_id, match.team1_player2_id]
      .sort()
      .join("-");
    const team2Key = [match.team2_player1_id, match.team2_player2_id]
      .sort()
      .join("-");

    const team1Won = match.team1_score > match.team2_score;

    // Initialize team stats if not exists
    if (!teamStats[team1Key]) {
      const p1 = state.players.find((p) => p.id === match.team1_player1_id);
      const p2 = state.players.find((p) => p.id === match.team1_player2_id);
      teamStats[team1Key] = {
        players: [p1?.name || "Unknown", p2?.name || "Unknown"].sort(),
        wins: 0,
        losses: 0,
        totalScore: 0,
        matches: 0,
      };
    }

    if (!teamStats[team2Key]) {
      const p1 = state.players.find((p) => p.id === match.team2_player1_id);
      const p2 = state.players.find((p) => p.id === match.team2_player2_id);
      teamStats[team2Key] = {
        players: [p1?.name || "Unknown", p2?.name || "Unknown"].sort(),
        wins: 0,
        losses: 0,
        totalScore: 0,
        matches: 0,
      };
    }

    // Update stats
    if (team1Won) {
      teamStats[team1Key].wins++;
      teamStats[team2Key].losses++;
    } else {
      teamStats[team2Key].wins++;
      teamStats[team1Key].losses++;
    }

    teamStats[team1Key].totalScore += match.team1_score;
    teamStats[team1Key].matches++;
    teamStats[team2Key].totalScore += match.team2_score;
    teamStats[team2Key].matches++;
  });

  // Convert to array and calculate stats
  return Object.values(teamStats)
    .map((team) => ({
      ...team,
      winRate:
        team.wins + team.losses > 0
          ? ((team.wins / (team.wins + team.losses)) * 100).toFixed(1)
          : 0,
      avgScore:
        team.matches > 0 ? (team.totalScore / team.matches).toFixed(1) : 0,
    }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return parseFloat(b.winRate) - parseFloat(a.winRate);
    });
}

function calculateAndRenderLeaderboards() {
  const playerStats = calculatePlayerStats();
  const teamStats = calculateTeamStats();

  renderTeamHighlights(teamStats);
  renderPlayerLeaderboard(playerStats);
  renderTeamLeaderboard(teamStats);
}

function renderTeamHighlights(teamStats) {
  const container = document.getElementById("team-highlights");

  if (teamStats.length === 0) {
    container.innerHTML =
      '<p class="text-center text-muted">No team data available yet</p>';
    return;
  }

  // Find team with most wins
  const mostWins = teamStats.reduce((max, team) =>
    team.wins > max.wins ? team : max,
  );

  // Find team with most losses
  const mostLosses = teamStats.reduce((max, team) =>
    team.losses > max.losses ? team : max,
  );

  container.innerHTML = `
    <div class="highlight-card success">
      <div class="highlight-icon">🏆</div>
      <div class="highlight-content">
        <h4>Most Wins</h4>
        <p class="highlight-team">${mostWins.players.join(" & ")}</p>
        <p class="highlight-stat">${mostWins.wins} ${mostWins.wins === 1 ? "win" : "wins"}</p>
        <p class="highlight-detail">${mostWins.winRate}% win rate</p>
      </div>
    </div>
    <div class="highlight-card danger">
      <div class="highlight-icon">📉</div>
      <div class="highlight-content">
        <h4>Most Losses</h4>
        <p class="highlight-team">${mostLosses.players.join(" & ")}</p>
        <p class="highlight-stat">${mostLosses.losses} ${mostLosses.losses === 1 ? "loss" : "losses"}</p>
        <p class="highlight-detail">${mostLosses.winRate}% win rate</p>
      </div>
    </div>
  `;
}

function renderPlayerLeaderboard(playerStats) {
  const tbody = document.getElementById("player-leaderboard-body");

  if (
    playerStats.length === 0 ||
    playerStats.every((p) => p.totalMatches === 0)
  ) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-muted">No match data available yet</td></tr>';
    return;
  }

  tbody.innerHTML = playerStats
    .filter((p) => p.totalMatches > 0) // Only show players with matches
    .map((player, index) => {
      const rank = index + 1;
      const rankClass = rank <= 3 ? `rank-${rank}` : "";
      const rankBadge =
        rank <= 3
          ? `<span class="rank-badge ${rankClass}">${rank}</span>`
          : rank;

      let winRateClass = "";
      const winRate = parseFloat(player.winRate);
      if (winRate >= 60) winRateClass = "high";
      else if (winRate >= 40) winRateClass = "medium";
      else winRateClass = "low";

      return `
        <tr>
          <td>${rankBadge}</td>
          <td><strong>${player.name}</strong></td>
          <td>${player.wins}</td>
          <td>${player.losses}</td>
          <td><span class="win-rate ${winRateClass}">${player.winRate}%</span></td>
          <td>${player.pointsFor}</td>
          <td>${player.pointsAgainst}</td>
        </tr>
      `;
    })
    .join("");
}

function renderTeamLeaderboard(teamStats) {
  const tbody = document.getElementById("team-leaderboard-body");

  if (teamStats.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-muted">No team data available yet</td></tr>';
    return;
  }

  tbody.innerHTML = teamStats
    .map((team, index) => {
      const rank = index + 1;
      const rankClass = rank <= 3 ? `rank-${rank}` : "";
      const rankBadge =
        rank <= 3
          ? `<span class="rank-badge ${rankClass}">${rank}</span>`
          : rank;

      let winRateClass = "";
      const winRate = parseFloat(team.winRate);
      if (winRate >= 60) winRateClass = "high";
      else if (winRate >= 40) winRateClass = "medium";
      else winRateClass = "low";

      return `
      <tr>
        <td>${rankBadge}</td>
        <td>${team.players.join(" & ")}</td>
        <td>${team.wins}</td>
        <td>${team.losses}</td>
        <td><span class="win-rate ${winRateClass}">${team.winRate}%</span></td>
        <td>${team.avgScore}</td>
      </tr>
    `;
    })
    .join("");
}

// ============================================================
// Initialization
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  // Initialize navigation
  initNavigation();

  // Set default match date to today
  const dateInput = document.getElementById("match-date");
  if (dateInput) {
    dateInput.valueAsDate = new Date();
  }

  // Form event listeners
  document
    .getElementById("add-player-form")
    ?.addEventListener("submit", addPlayer);
  document
    .getElementById("add-match-form")
    ?.addEventListener("submit", addMatch);
  document
    .getElementById("generate-teams-btn")
    ?.addEventListener("click", generateRandomTeams);

  // Load initial data (leaderboard is the landing page)
  loadLeaderboard();
});
