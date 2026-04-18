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
  currentClub: null, // Current club information
};

// ============================================================
// Multi-Tenant Club Management
// ============================================================

/**
 * Get club slug from URL parameter or localStorage
 * Priority: URL parameter > localStorage > default
 */
function getClubSlug() {
  // Check URL parameter (?club=smash-house)
  const urlParams = new URLSearchParams(window.location.search);
  const clubParam = urlParams.get("club");

  if (clubParam) {
    // Save to localStorage for future visits
    localStorage.setItem("selectedClub", clubParam);
    return clubParam;
  }

  // Check localStorage
  const savedClub = localStorage.getItem("selectedClub");
  if (savedClub) {
    return savedClub;
  }

  // Default club (for backward compatibility)
  return "smash-house";
}

/**
 * Load club information from database
 */
async function loadClubInfo() {
  const clubSlug = getClubSlug();

  try {
    const { data, error } = await supabaseClient
      .from("clubs")
      .select("*")
      .eq("slug", clubSlug)
      .single();

    if (error) {
      console.error("Error loading club:", error);
      // If club doesn't exist, try to create it with default values
      return await createDefaultClub(clubSlug);
    }

    state.currentClub = data;
    applyClubBranding(data);
    return data;
  } catch (err) {
    console.error("Error loading club info:", err);
    showToast("Error loading club information", "error");
    return null;
  }
}

/**
 * Create default club if it doesn't exist (for migration/backward compatibility)
 */
async function createDefaultClub(slug) {
  const defaultClubs = {
    "smash-house": {
      name: "Smash House",
      primaryColor: "#667eea",
      secondaryColor: "#764ba2",
    },
  };

  const clubData = defaultClubs[slug] || {
    name: slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
    primaryColor: "#667eea",
    secondaryColor: "#764ba2",
  };

  try {
    const { data, error } = await supabaseClient
      .from("clubs")
      .insert([
        {
          slug: slug,
          name: clubData.name,
          primary_color: clubData.primaryColor,
          secondary_color: clubData.secondaryColor,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating club:", error);
      return null;
    }

    state.currentClub = data;
    applyClubBranding(data);
    return data;
  } catch (err) {
    console.error("Error creating default club:", err);
    return null;
  }
}

/**
 * Apply club branding to the UI
 */
function applyClubBranding(club) {
  // Update club name in header
  const logoElement = document.querySelector(".logo h1");
  if (logoElement) {
    logoElement.textContent = `🏸 ${club.name}`;
  }

  // Update page title
  document.title = club.name;

  // Apply custom colors (optional - can be extended)
  if (club.primary_color && club.secondary_color) {
    document.documentElement.style.setProperty(
      "--club-primary",
      club.primary_color,
    );
    document.documentElement.style.setProperty(
      "--club-secondary",
      club.secondary_color,
    );
  }
}

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
    if (!state.currentClub) {
      throw new Error("Club not loaded");
    }

    const { data, error } = await supabaseClient
      .from("players")
      .select("*")
      .eq("club_id", state.currentClub.id)
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
  const tbody = document.getElementById("players-list-body");

  if (state.players.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" class="text-center text-muted">No players added yet. Add your first player above!</td></tr>';
    return;
  }

  tbody.innerHTML = state.players
    .map(
      (player, index) => `
    <tr id="player-row-${player.id}">
      <td>${index + 1}</td>
      <td class="player-name-cell">
        <span class="player-name-display" id="player-name-${player.id}">${player.name}</span>
        <div class="player-edit-form" id="player-edit-${player.id}" style="display: none;">
          <input type="text" class="input input-inline" id="edit-input-${player.id}" value="${player.name}" />
        </div>
      </td>
      <td class="player-actions-cell">
        <div class="player-actions" id="player-actions-${player.id}">
          <button class="btn btn-secondary btn-small" onclick="editPlayer('${player.id}')">
            Edit
          </button>
          <button class="btn btn-danger btn-small" onclick="deletePlayer('${player.id}')">
            Delete
          </button>
        </div>
        <div class="player-edit-actions" id="player-edit-actions-${player.id}" style="display: none;">
          <button class="btn btn-primary btn-small" onclick="savePlayerEdit('${player.id}')">
            Save
          </button>
          <button class="btn btn-secondary btn-small" onclick="cancelPlayerEdit('${player.id}')">
            Cancel
          </button>
        </div>
      </td>
    </tr>
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
    if (!state.currentClub) {
      throw new Error("Club not loaded");
    }

    const { data, error } = await supabaseClient
      .from("players")
      .insert([{ name, club_id: state.currentClub.id }])
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
    if (!state.currentClub) {
      throw new Error("Club not loaded");
    }

    const { error } = await supabaseClient
      .from("players")
      .delete()
      .eq("id", playerId)
      .eq("club_id", state.currentClub.id);

    if (error) throw error;

    showToast("Player deleted successfully", "success");
    loadPlayers();
  } catch (error) {
    console.error("Error deleting player:", error);
    showToast("Failed to delete player", "error");
    hideLoading();
  }
}

function editPlayer(playerId) {
  // Hide player name display and normal actions
  document.getElementById(`player-name-${playerId}`).style.display = "none";
  document.getElementById(`player-actions-${playerId}`).style.display = "none";

  // Show edit form and edit actions
  document.getElementById(`player-edit-${playerId}`).style.display = "block";
  document.getElementById(`player-edit-actions-${playerId}`).style.display =
    "flex";

  // Focus on input
  document.getElementById(`edit-input-${playerId}`).focus();
  document.getElementById(`edit-input-${playerId}`).select();
}

function cancelPlayerEdit(playerId) {
  // Show player name display and normal actions
  document.getElementById(`player-name-${playerId}`).style.display = "block";
  document.getElementById(`player-actions-${playerId}`).style.display = "flex";

  // Hide edit form and edit actions
  document.getElementById(`player-edit-${playerId}`).style.display = "none";
  document.getElementById(`player-edit-actions-${playerId}`).style.display =
    "none";

  // Reset input value
  const player = state.players.find((p) => p.id === playerId);
  if (player) {
    document.getElementById(`edit-input-${playerId}`).value = player.name;
  }
}

async function savePlayerEdit(playerId) {
  const newName = document
    .getElementById(`edit-input-${playerId}`)
    .value.trim();

  if (!newName) {
    showToast("Player name cannot be empty", "warning");
    return;
  }

  // Check if name is unchanged
  const player = state.players.find((p) => p.id === playerId);
  if (player && player.name === newName) {
    cancelPlayerEdit(playerId);
    return;
  }

  showLoading();

  try {
    if (!state.currentClub) {
      throw new Error("Club not loaded");
    }

    const { error } = await supabaseClient
      .from("players")
      .update({ name: newName })
      .eq("id", playerId)
      .eq("club_id", state.currentClub.id);

    if (error) throw error;

    showToast("Player name updated successfully!", "success");
    loadPlayers();
  } catch (error) {
    console.error("Error updating player:", error);
    showToast("Failed to update player name", "error");
    hideLoading();
  }
}

// Make functions globally available
window.deletePlayer = deletePlayer;
window.editPlayer = editPlayer;
window.cancelPlayerEdit = cancelPlayerEdit;
window.savePlayerEdit = savePlayerEdit;

// ============================================================
// Team Generation
// ============================================================

async function loadPlayersForTeamSelection() {
  showLoading();

  try {
    if (!state.currentClub) {
      throw new Error("Club not loaded");
    }

    const { data, error } = await supabaseClient
      .from("players")
      .select("*")
      .eq("club_id", state.currentClub.id)
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
    if (!state.currentClub) {
      throw new Error("Club not loaded");
    }

    const { data, error } = await supabaseClient
      .from("players")
      .select("*")
      .eq("club_id", state.currentClub.id)
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

async function checkDuplicateMatch(
  matchDate,
  team1Player1,
  team1Player2,
  team1Score,
  team2Player1,
  team2Player2,
  team2Score,
) {
  try {
    if (!state.currentClub) {
      return null;
    }

    // Get all matches for this date
    const { data, error } = await supabaseClient
      .from("matches")
      .select("*")
      .eq("club_id", state.currentClub.id)
      .eq("match_date", matchDate);

    if (error) throw error;

    // Check if any existing match has the same players and scores
    const duplicate = data.find((match) => {
      const inputPlayers = [
        team1Player1,
        team1Player2,
        team2Player1,
        team2Player2,
      ].sort();
      const existingPlayers = [
        match.team1_player1_id,
        match.team1_player2_id,
        match.team2_player1_id,
        match.team2_player2_id,
      ].sort();

      // Check if all 4 players are the same
      const samePlayers =
        JSON.stringify(inputPlayers) === JSON.stringify(existingPlayers);

      if (!samePlayers) return false;

      // Check if scores match (either same way or reversed)
      const sameScores =
        (match.team1_score === team1Score &&
          match.team2_score === team2Score) ||
        (match.team1_score === team2Score && match.team2_score === team1Score);

      return sameScores;
    });

    return duplicate;
  } catch (error) {
    console.error("Error checking duplicate:", error);
    return null;
  }
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

  // Check for duplicate match
  showLoading();
  const duplicate = await checkDuplicateMatch(
    matchDate,
    team1Player1,
    team1Player2,
    team1Score,
    team2Player1,
    team2Player2,
    team2Score,
  );
  hideLoading();

  if (duplicate) {
    const team1Names = [
      state.players.find((p) => p.id === team1Player1)?.name,
      state.players.find((p) => p.id === team1Player2)?.name,
    ].join(" & ");

    const team2Names = [
      state.players.find((p) => p.id === team2Player1)?.name,
      state.players.find((p) => p.id === team2Player2)?.name,
    ].join(" & ");

    const confirmMessage = `⚠️ Possible Duplicate Match Detected!\n\nA match with the same players, scores, and date already exists:\n\n${team1Names} (${team1Score}) vs ${team2Names} (${team2Score})\nDate: ${new Date(matchDate).toLocaleDateString()}\n\nDo you want to add this match anyway?`;

    if (!confirm(confirmMessage)) {
      return;
    }
  }

  showLoading();

  try {
    if (!state.currentClub) {
      throw new Error("Club not loaded");
    }

    const { data, error } = await supabaseClient
      .from("matches")
      .insert([
        {
          club_id: state.currentClub.id,
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
    if (!state.currentClub) {
      throw new Error("Club not loaded");
    }

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
      .eq("club_id", state.currentClub.id)
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
    if (!state.currentClub) {
      throw new Error("Club not loaded");
    }

    const { error } = await supabaseClient
      .from("matches")
      .delete()
      .eq("id", matchId)
      .eq("club_id", state.currentClub.id);

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
    if (!state.currentClub) {
      throw new Error("Club not loaded");
    }

    // Load all data
    const [playersResult, matchesResult] = await Promise.all([
      supabaseClient
        .from("players")
        .select("*")
        .eq("club_id", state.currentClub.id),
      supabaseClient
        .from("matches")
        .select("*")
        .eq("club_id", state.currentClub.id),
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
  renderPerformanceStats(playerStats, teamStats);
  renderActivityHeatmap();
  renderCompatibilityMatrix();
  renderHeadToHeadStats(playerStats);
  renderMonthlyLeaders(playerStats);
  renderPerformanceTrends(playerStats);
  renderAchievements(playerStats);
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

function renderPerformanceStats(playerStats, teamStats) {
  const container = document.getElementById("performance-stats");

  if (state.matches.length === 0) {
    container.innerHTML =
      '<p class="text-center text-muted">No match data available yet</p>';
    return;
  }

  // Calculate Win Streak
  const winStreak = calculateLongestWinStreak(playerStats);

  // Calculate Recent Form
  const recentForm = calculateRecentForm(playerStats);

  // Calculate Best Partnership
  const bestPartnership =
    teamStats
      .filter((t) => t.wins + t.losses >= 2)
      .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))[0] ||
    teamStats[0];

  // Calculate Biggest Win
  const biggestWin = calculateBiggestWin();

  // Calculate Most Active Player
  const mostActive = playerStats.reduce((max, p) =>
    p.totalMatches > max.totalMatches ? p : max,
  );

  container.innerHTML = `
    <div class="highlight-card info">
      <div class="highlight-icon">🔥</div>
      <div class="highlight-content">
        <h4>Longest Win Streak</h4>
        <p class="highlight-team">${winStreak.player}</p>
        <p class="highlight-stat">${winStreak.streak} ${winStreak.streak === 1 ? "win" : "wins"}</p>
        <p class="highlight-detail">${winStreak.isActive ? "Active streak!" : "Past streak"}</p>
      </div>
    </div>
    <div class="highlight-card ${recentForm.trend === "hot" ? "success" : recentForm.trend === "cold" ? "danger" : "warning"}">
      <div class="highlight-icon">${recentForm.trend === "hot" ? "📈" : recentForm.trend === "cold" ? "📉" : "➡️"}</div>
      <div class="highlight-content">
        <h4>Recent Form (Last 5)</h4>
        <p class="highlight-team">${recentForm.player}</p>
        <p class="highlight-stat">${recentForm.wins}-${recentForm.losses} Record</p>
        <p class="highlight-detail">${recentForm.winRate}% win rate</p>
      </div>
    </div>
    <div class="highlight-card success">
      <div class="highlight-icon">🤝</div>
      <div class="highlight-content">
        <h4>Best Partnership</h4>
        <p class="highlight-team">${bestPartnership.players.join(" & ")}</p>
        <p class="highlight-stat">${bestPartnership.winRate}% Win Rate</p>
        <p class="highlight-detail">${bestPartnership.wins}-${bestPartnership.losses} (${bestPartnership.wins + bestPartnership.losses} matches)</p>
      </div>
    </div>
    <div class="highlight-card warning">
      <div class="highlight-icon">💥</div>
      <div class="highlight-content">
        <h4>Biggest Win</h4>
        <p class="highlight-team">${biggestWin.winners.join(" & ")}</p>
        <p class="highlight-stat">${biggestWin.score}</p>
        <p class="highlight-detail">Margin: ${biggestWin.margin} points</p>
      </div>
    </div>
    <div class="highlight-card info">
      <div class="highlight-icon">⚡</div>
      <div class="highlight-content">
        <h4>Most Active Player</h4>
        <p class="highlight-team">${mostActive.name}</p>
        <p class="highlight-stat">${mostActive.totalMatches} ${mostActive.totalMatches === 1 ? "match" : "matches"}</p>
        <p class="highlight-detail">${mostActive.wins}-${mostActive.losses} record</p>
      </div>
    </div>
  `;
}

function calculateLongestWinStreak(playerStats) {
  let bestStreak = { player: "N/A", streak: 0, isActive: false };

  state.players.forEach((player) => {
    let currentStreak = 0;
    let maxStreak = 0;
    let isActive = false;

    // Sort matches by date
    const sortedMatches = [...state.matches].sort(
      (a, b) => new Date(a.match_date) - new Date(b.match_date),
    );

    sortedMatches.forEach((match) => {
      const isInMatch =
        String(match.team1_player1_id) === String(player.id) ||
        String(match.team1_player2_id) === String(player.id) ||
        String(match.team2_player1_id) === String(player.id) ||
        String(match.team2_player2_id) === String(player.id);

      if (!isInMatch) return;

      const team1Won = match.team1_score > match.team2_score;
      const playerWon =
        (String(match.team1_player1_id) === String(player.id) ||
          String(match.team1_player2_id) === String(player.id)) &&
        team1Won;
      const playerWon2 =
        (String(match.team2_player1_id) === String(player.id) ||
          String(match.team2_player2_id) === String(player.id)) &&
        !team1Won;

      if (playerWon || playerWon2) {
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          isActive = true;
        }
      } else {
        currentStreak = 0;
        isActive = false;
      }
    });

    if (maxStreak > bestStreak.streak) {
      bestStreak = {
        player: player.name,
        streak: maxStreak,
        isActive: isActive,
      };
    }
  });

  return bestStreak;
}

function calculateRecentForm(playerStats) {
  let bestForm = {
    player: "N/A",
    wins: 0,
    losses: 0,
    winRate: 0,
    trend: "neutral",
  };

  state.players.forEach((player) => {
    // Get last 5 matches for this player
    const playerMatches = state.matches
      .filter(
        (m) =>
          String(m.team1_player1_id) === String(player.id) ||
          String(m.team1_player2_id) === String(player.id) ||
          String(m.team2_player1_id) === String(player.id) ||
          String(m.team2_player2_id) === String(player.id),
      )
      .sort((a, b) => new Date(b.match_date) - new Date(a.match_date))
      .slice(0, 5);

    if (playerMatches.length === 0) return;

    let wins = 0;
    playerMatches.forEach((match) => {
      const team1Won = match.team1_score > match.team2_score;
      const playerInTeam1 =
        String(match.team1_player1_id) === String(player.id) ||
        String(match.team1_player2_id) === String(player.id);

      if ((playerInTeam1 && team1Won) || (!playerInTeam1 && !team1Won)) {
        wins++;
      }
    });

    const losses = playerMatches.length - wins;
    const winRate = ((wins / playerMatches.length) * 100).toFixed(1);
    let trend = "neutral";
    if (winRate >= 60) trend = "hot";
    else if (winRate < 40) trend = "cold";

    if (parseFloat(winRate) > parseFloat(bestForm.winRate)) {
      bestForm = {
        player: player.name,
        wins: wins,
        losses: losses,
        winRate: winRate,
        trend: trend,
      };
    }
  });

  return bestForm;
}

function calculateBiggestWin() {
  if (state.matches.length === 0) {
    return { winners: ["N/A"], score: "0-0", margin: 0 };
  }

  const biggestMatch = state.matches.reduce((max, match) => {
    const margin = Math.abs(match.team1_score - match.team2_score);
    const maxMargin = Math.abs(max.team1_score - max.team2_score);
    return margin > maxMargin ? match : max;
  });

  const team1Won = biggestMatch.team1_score > biggestMatch.team2_score;
  const winnerIds = team1Won
    ? [biggestMatch.team1_player1_id, biggestMatch.team1_player2_id]
    : [biggestMatch.team2_player1_id, biggestMatch.team2_player2_id];

  const winners = winnerIds
    .map((id) => {
      const player = state.players.find((p) => String(p.id) === String(id));
      return player?.name || "Unknown";
    })
    .sort();

  return {
    winners: winners,
    score: `${biggestMatch.team1_score}-${biggestMatch.team2_score}`,
    margin: Math.abs(biggestMatch.team1_score - biggestMatch.team2_score),
  };
}

function renderActivityHeatmap() {
  const container = document.getElementById("activity-heatmap");

  if (state.matches.length === 0) {
    container.innerHTML =
      '<p class="text-center text-muted">No match data available yet</p>';
    return;
  }

  // Group matches by day of week
  const dayCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  state.matches.forEach((match) => {
    const day = new Date(match.match_date).getDay();
    dayCount[day]++;
  });

  const maxCount = Math.max(...Object.values(dayCount));

  let heatmapHTML = '<div class="heatmap-grid">';

  Object.keys(dayCount).forEach((day) => {
    const count = dayCount[day];
    const intensity = maxCount > 0 ? (count / maxCount) * 100 : 0;
    let intensityClass = "none";
    if (intensity > 75) intensityClass = "high";
    else if (intensity > 50) intensityClass = "medium-high";
    else if (intensity > 25) intensityClass = "medium";
    else if (intensity > 0) intensityClass = "low";

    heatmapHTML += `
      <div class="heatmap-cell ${intensityClass}" title="${count} matches on ${dayNames[day]}">
        <div class="heatmap-day">${dayNames[day]}</div>
        <div class="heatmap-count">${count}</div>
      </div>
    `;
  });

  heatmapHTML += "</div>";
  container.innerHTML = heatmapHTML;
}

function renderCompatibilityMatrix() {
  const container = document.getElementById("compatibility-matrix");

  if (state.players.length < 2) {
    container.innerHTML =
      '<p class="text-center text-muted">Need at least 2 players for compatibility analysis</p>';
    return;
  }

  // Calculate partnership stats
  const partnerships = {};

  state.matches.forEach((match) => {
    // Team 1 partnership
    const team1Key = [match.team1_player1_id, match.team1_player2_id]
      .sort()
      .join("-");
    if (!partnerships[team1Key]) {
      partnerships[team1Key] = {
        players: [match.team1_player1_id, match.team1_player2_id].sort(),
        wins: 0,
        losses: 0,
      };
    }

    // Team 2 partnership
    const team2Key = [match.team2_player1_id, match.team2_player2_id]
      .sort()
      .join("-");
    if (!partnerships[team2Key]) {
      partnerships[team2Key] = {
        players: [match.team2_player1_id, match.team2_player2_id].sort(),
        wins: 0,
        losses: 0,
      };
    }

    // Update wins/losses
    if (match.team1_score > match.team2_score) {
      partnerships[team1Key].wins++;
      partnerships[team2Key].losses++;
    } else {
      partnerships[team2Key].wins++;
      partnerships[team1Key].losses++;
    }
  });

  // Sort players by name
  const sortedPlayers = [...state.players].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  // Build the matrix with proper grid template
  const gridSize = sortedPlayers.length + 1;
  let matrixHTML = `
    <div class="matrix-instructions">
      <p><strong>How to read:</strong> Find a player in the left column, then look across the row to see their win rate when paired with each player in the top row. Hover over cells for detailed stats.</p>
    </div>
    <div class="compatibility-grid" style="grid-template-columns: repeat(${gridSize}, auto);">
  `;

  // Header row (top left corner is empty)
  matrixHTML += '<div class="matrix-header corner"></div>';
  sortedPlayers.forEach((player) => {
    matrixHTML += `<div class="matrix-header top">${player.name}</div>`;
  });

  // Data rows
  sortedPlayers.forEach((player1) => {
    matrixHTML += `<div class="matrix-row-header">${player1.name}</div>`;

    sortedPlayers.forEach((player2) => {
      if (player1.id === player2.id) {
        matrixHTML +=
          '<div class="matrix-cell self" title="Same player">—</div>';
      } else {
        const key = [player1.id, player2.id].sort().join("-");
        const partnership = partnerships[key];

        if (!partnership || partnership.wins + partnership.losses < 2) {
          const matchCount = partnership
            ? partnership.wins + partnership.losses
            : 0;
          matrixHTML += `<div class="matrix-cell no-data" title="Only ${matchCount} match${matchCount !== 1 ? "es" : ""} together - need at least 2 matches for stats">
            <span class="cell-main">—</span>
            <span class="cell-sub">${matchCount > 0 ? matchCount + "m" : ""}</span>
          </div>`;
        } else {
          const total = partnership.wins + partnership.losses;
          const winRate = ((partnership.wins / total) * 100).toFixed(0);
          let rateClass = "low";
          if (winRate >= 70) rateClass = "high";
          else if (winRate >= 50) rateClass = "medium";

          matrixHTML += `
            <div class="matrix-cell ${rateClass}" title="${player1.name} & ${player2.name}: ${partnership.wins} wins, ${partnership.losses} losses in ${total} matches together">
              <span class="cell-main">${winRate}%</span>
              <span class="cell-sub">${partnership.wins}-${partnership.losses}</span>
            </div>
          `;
        }
      }
    });
  });

  matrixHTML += "</div>";
  container.innerHTML = matrixHTML;
}

function renderHeadToHeadStats(playerStats) {
  const container = document.getElementById("head-to-head-stats");

  if (state.matches.length === 0) {
    container.innerHTML =
      '<p class="text-center text-muted">No match data available yet</p>';
    return;
  }

  // Calculate rivalries (most frequent opponent matchups)
  const matchups = {};
  state.matches.forEach((match) => {
    const team1 = [match.team1_player1_id, match.team1_player2_id]
      .sort()
      .join("-");
    const team2 = [match.team2_player1_id, match.team2_player2_id]
      .sort()
      .join("-");
    const key = [team1, team2].sort().join(" vs ");

    if (!matchups[key]) {
      matchups[key] = { team1, team2, count: 0, team1Wins: 0, team2Wins: 0 };
    }
    matchups[key].count++;

    const team1Won = match.team1_score > match.team2_score;
    if (
      [match.team1_player1_id, match.team1_player2_id].sort().join("-") ===
      matchups[key].team1
    ) {
      if (team1Won) matchups[key].team1Wins++;
      else matchups[key].team2Wins++;
    } else {
      if (team1Won) matchups[key].team2Wins++;
      else matchups[key].team1Wins++;
    }
  });

  const rivalry = Object.values(matchups).sort((a, b) => b.count - a.count)[0];

  let rivalryTeam1 = "N/A";
  let rivalryTeam2 = "N/A";

  if (rivalry) {
    const team1Names = rivalry.team1
      .split("-")
      .map((id) => {
        const player = state.players.find((p) => String(p.id) === String(id));
        return player?.name || null;
      })
      .filter((name) => name);

    const team2Names = rivalry.team2
      .split("-")
      .map((id) => {
        const player = state.players.find((p) => String(p.id) === String(id));
        return player?.name || null;
      })
      .filter((name) => name);

    rivalryTeam1 =
      team1Names.length > 0 ? team1Names.join(" & ") : "Unknown Team";
    rivalryTeam2 =
      team2Names.length > 0 ? team2Names.join(" & ") : "Unknown Team";
  }

  // Calculate nemesis and favorite opponent for players
  const playerMatchups = {};
  state.players.forEach((player) => {
    playerMatchups[player.id] = { opponents: {} };
  });

  state.matches.forEach((match) => {
    const team1Players = [
      {
        id: match.team1_player1_id,
        won: match.team1_score > match.team2_score,
      },
      {
        id: match.team1_player2_id,
        won: match.team1_score > match.team2_score,
      },
    ];

    const team2Players = [
      {
        id: match.team2_player1_id,
        won: match.team2_score > match.team1_score,
      },
      {
        id: match.team2_player2_id,
        won: match.team2_score > match.team1_score,
      },
    ];

    // Team1 players vs Team2 players
    team1Players.forEach((player1) => {
      team2Players.forEach((player2) => {
        const oppId = player2.id;
        if (!playerMatchups[player1.id].opponents[oppId]) {
          playerMatchups[player1.id].opponents[oppId] = {
            wins: 0,
            losses: 0,
          };
        }
        if (player1.won) {
          playerMatchups[player1.id].opponents[oppId].wins++;
        } else {
          playerMatchups[player1.id].opponents[oppId].losses++;
        }
      });
    });

    // Team2 players vs Team1 players
    team2Players.forEach((player1) => {
      team1Players.forEach((player2) => {
        const oppId = player2.id;
        if (!playerMatchups[player1.id].opponents[oppId]) {
          playerMatchups[player1.id].opponents[oppId] = {
            wins: 0,
            losses: 0,
          };
        }
        if (player1.won) {
          playerMatchups[player1.id].opponents[oppId].wins++;
        } else {
          playerMatchups[player1.id].opponents[oppId].losses++;
        }
      });
    });
  });

  // Find nemesis (worst record against)
  let nemesisPlayer = null;
  let nemesisOpponent = null;
  let worstRecord = 1;

  Object.keys(playerMatchups).forEach((playerId) => {
    Object.keys(playerMatchups[playerId].opponents).forEach((oppId) => {
      const record = playerMatchups[playerId].opponents[oppId];
      const total = record.wins + record.losses;
      if (total >= 3) {
        const winRate = record.wins / total;
        if (winRate < worstRecord) {
          worstRecord = winRate;
          nemesisPlayer = playerId;
          nemesisOpponent = oppId;
        }
      }
    });
  });

  const nemesis =
    nemesisPlayer && nemesisOpponent
      ? {
          player:
            state.players.find((p) => String(p.id) === String(nemesisPlayer))
              ?.name || "N/A",
          opponent:
            state.players.find((p) => String(p.id) === String(nemesisOpponent))
              ?.name || "N/A",
          record: playerMatchups[nemesisPlayer].opponents[nemesisOpponent],
        }
      : null;

  // Find favorite opponent (best record against)
  let favoritePlayer = null;
  let favoriteOpponent = null;
  let bestRecord = 0;

  Object.keys(playerMatchups).forEach((playerId) => {
    Object.keys(playerMatchups[playerId].opponents).forEach((oppId) => {
      const record = playerMatchups[playerId].opponents[oppId];
      const total = record.wins + record.losses;
      if (total >= 3) {
        const winRate = record.wins / total;
        if (winRate > bestRecord) {
          bestRecord = winRate;
          favoritePlayer = playerId;
          favoriteOpponent = oppId;
        }
      }
    });
  });

  const favorite =
    favoritePlayer && favoriteOpponent
      ? {
          player:
            state.players.find((p) => String(p.id) === String(favoritePlayer))
              ?.name || "N/A",
          opponent:
            state.players.find((p) => String(p.id) === String(favoriteOpponent))
              ?.name || "N/A",
          record: playerMatchups[favoritePlayer].opponents[favoriteOpponent],
        }
      : null;

  // Find unfinished business (teams never beaten)
  const teamRecords = {};
  state.matches.forEach((match) => {
    const team1 = [match.team1_player1_id, match.team1_player2_id]
      .sort()
      .join("-");
    const team2 = [match.team2_player1_id, match.team2_player2_id]
      .sort()
      .join("-");

    if (!teamRecords[team1])
      teamRecords[team1] = { wins: 0, opponents: new Set() };
    if (!teamRecords[team2])
      teamRecords[team2] = { wins: 0, opponents: new Set() };

    teamRecords[team1].opponents.add(team2);
    teamRecords[team2].opponents.add(team1);

    if (match.team1_score > match.team2_score) {
      teamRecords[team1].wins++;
    } else {
      teamRecords[team2].wins++;
    }
  });

  let unfinishedBusiness = null;
  Object.keys(teamRecords).forEach((teamKey) => {
    const opponents = Array.from(teamRecords[teamKey].opponents);
    opponents.forEach((oppKey) => {
      const matchesVsOpp = state.matches.filter((m) => {
        const t1 = [m.team1_player1_id, m.team1_player2_id].sort().join("-");
        const t2 = [m.team2_player1_id, m.team2_player2_id].sort().join("-");
        return (
          (t1 === teamKey && t2 === oppKey) || (t1 === oppKey && t2 === teamKey)
        );
      });

      const winsVsOpp = matchesVsOpp.filter((m) => {
        const t1 = [m.team1_player1_id, m.team1_player2_id].sort().join("-");
        const won = m.team1_score > m.team2_score;
        return (t1 === teamKey && won) || (t1 !== teamKey && !won);
      }).length;

      if (matchesVsOpp.length >= 3 && winsVsOpp === 0 && !unfinishedBusiness) {
        unfinishedBusiness = {
          team: teamKey
            .split("-")
            .map((id) => {
              const player = state.players.find(
                (p) => String(p.id) === String(id),
              );
              return player?.name || null;
            })
            .filter((name) => name)
            .join(" & "),
          opponent: oppKey
            .split("-")
            .map((id) => {
              const player = state.players.find(
                (p) => String(p.id) === String(id),
              );
              return player?.name || null;
            })
            .filter((name) => name)
            .join(" & "),
          matches: matchesVsOpp.length,
        };
      }
    });
  });

  container.innerHTML = `
    <div class="highlight-card info">
      <div class="highlight-icon">⚔️</div>
      <div class="highlight-content">
        <h4>Biggest Rivalry</h4>
        <p class="highlight-team">${rivalryTeam1} vs ${rivalryTeam2}</p>
        <p class="highlight-stat">${rivalry ? rivalry.count : 0} ${rivalry && rivalry.count === 1 ? "match" : "matches"}</p>
        <p class="highlight-detail">${rivalry ? `${rivalry.team1Wins}-${rivalry.team2Wins} series` : "No rivalries yet"}</p>
      </div>
    </div>
    <div class="highlight-card danger">
      <div class="highlight-icon">😰</div>
      <div class="highlight-content">
        <h4>Nemesis</h4>
        <p class="highlight-team">${nemesis ? nemesis.player : "N/A"}</p>
        <p class="highlight-stat">${nemesis ? "vs " + nemesis.opponent : "No nemesis yet"}</p>
        <p class="highlight-detail">${nemesis ? `${nemesis.record.wins}-${nemesis.record.losses} record` : "Need 3+ matches vs same opponent"}</p>
      </div>
    </div>
    <div class="highlight-card success">
      <div class="highlight-icon">🎯</div>
      <div class="highlight-content">
        <h4>Favorite Opponent</h4>
        <p class="highlight-team">${favorite ? favorite.player : "N/A"}</p>
        <p class="highlight-stat">${favorite ? "vs " + favorite.opponent : "No favorite yet"}</p>
        <p class="highlight-detail">${favorite ? `${favorite.record.wins}-${favorite.record.losses} record` : "Need 3+ matches vs same opponent"}</p>
      </div>
    </div>
    <div class="highlight-card warning">
      <div class="highlight-icon">🎲</div>
      <div class="highlight-content">
        <h4>Unfinished Business</h4>
        <p class="highlight-team">${unfinishedBusiness ? unfinishedBusiness.team : "N/A"}</p>
        <p class="highlight-stat">${unfinishedBusiness ? "vs " + unfinishedBusiness.opponent : "All rivalries settled"}</p>
        <p class="highlight-detail">${unfinishedBusiness ? `0-${unfinishedBusiness.matches} (never won)` : "No winless matchups"}</p>
      </div>
    </div>
  `;
}

function renderMonthlyLeaders(playerStats) {
  const container = document.getElementById("monthly-leaders");

  if (state.matches.length === 0) {
    container.innerHTML =
      '<p class="text-center text-muted">No data yet - play some matches!</p>';
    return;
  }

  // Group matches by month
  const monthlyData = {};
  state.matches.forEach((match) => {
    const date = new Date(match.match_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthName = date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        monthName,
        players: {},
      };
    }

    // Track wins for each player in this month
    const team1Won = match.team1_score > match.team2_score;
    const allPlayers = [
      { id: match.team1_player1_id, won: team1Won },
      { id: match.team1_player2_id, won: team1Won },
      { id: match.team2_player1_id, won: !team1Won },
      { id: match.team2_player2_id, won: !team1Won },
    ];

    allPlayers.forEach((p) => {
      if (!monthlyData[monthKey].players[p.id]) {
        monthlyData[monthKey].players[p.id] = { wins: 0, matches: 0 };
      }
      monthlyData[monthKey].players[p.id].matches++;
      if (p.won) {
        monthlyData[monthKey].players[p.id].wins++;
      }
    });
  });

  // Find top performer for each month
  const monthlyLeaders = Object.entries(monthlyData)
    .map(([monthKey, data]) => {
      let topPlayer = null;
      let topWins = 0;
      let topWinRate = 0;

      Object.entries(data.players).forEach(([playerId, stats]) => {
        const winRate = (stats.wins / stats.matches) * 100;
        // Prioritize win rate, but need at least 2 matches
        if (
          stats.matches >= 2 &&
          (winRate > topWinRate ||
            (winRate === topWinRate && stats.wins > topWins))
        ) {
          topPlayer = playerId;
          topWins = stats.wins;
          topWinRate = winRate;
        }
      });

      if (!topPlayer) {
        // If no one has 2+ matches, just pick the player with most wins
        Object.entries(data.players).forEach(([playerId, stats]) => {
          if (stats.wins > topWins) {
            topPlayer = playerId;
            topWins = stats.wins;
            topWinRate = (stats.wins / stats.matches) * 100;
          }
        });
      }

      return {
        monthKey,
        monthName: data.monthName,
        player: state.players.find((p) => String(p.id) === String(topPlayer)),
        wins: topWins,
        matches: data.players[topPlayer]?.matches || 0,
        winRate: topWinRate.toFixed(1),
      };
    })
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey)); // Most recent first

  container.innerHTML = monthlyLeaders
    .slice(0, 6) // Show last 6 months
    .map(
      (leader) => `
    <div class="monthly-leader-card">
      <div class="monthly-leader-month">${leader.monthName}</div>
      <div class="monthly-leader-player">
        <span class="trophy-icon">👑</span>
        ${leader.player?.name || "N/A"}
      </div>
      <div class="monthly-leader-stats">
        ${leader.wins}W - ${leader.matches - leader.wins}L (${leader.winRate}%)
      </div>
    </div>
  `,
    )
    .join("");
}

function renderPerformanceTrends(playerStats) {
  const container = document.getElementById("performance-trends");

  if (state.matches.length === 0) {
    container.innerHTML =
      '<p class="text-center text-muted">No data yet - play some matches!</p>';
    return;
  }

  // Calculate trends for each player over the last 10 matches
  const playerTrends = state.players
    .map((player) => {
      const playerMatches = state.matches
        .filter(
          (m) =>
            String(m.team1_player1_id) === String(player.id) ||
            String(m.team1_player2_id) === String(player.id) ||
            String(m.team2_player1_id) === String(player.id) ||
            String(m.team2_player2_id) === String(player.id),
        )
        .sort((a, b) => new Date(a.match_date) - new Date(b.match_date));

      if (playerMatches.length < 5) return null; // Need at least 5 matches for trend

      // Split matches into first half and second half
      const midpoint = Math.floor(playerMatches.length / 2);
      const firstHalf = playerMatches.slice(0, midpoint);
      const secondHalf = playerMatches.slice(midpoint);

      const calculateWinRate = (matches) => {
        let wins = 0;
        matches.forEach((match) => {
          const team1Won = match.team1_score > match.team2_score;
          const playerInTeam1 =
            String(match.team1_player1_id) === String(player.id) ||
            String(match.team1_player2_id) === String(player.id);
          if ((playerInTeam1 && team1Won) || (!playerInTeam1 && !team1Won)) {
            wins++;
          }
        });
        return (wins / matches.length) * 100;
      };

      const firstHalfWinRate = calculateWinRate(firstHalf);
      const secondHalfWinRate = calculateWinRate(secondHalf);
      const trend = secondHalfWinRate - firstHalfWinRate;

      return {
        player,
        firstHalfWinRate: firstHalfWinRate.toFixed(1),
        secondHalfWinRate: secondHalfWinRate.toFixed(1),
        firstHalfMatches: firstHalf.length,
        secondHalfMatches: secondHalf.length,
        trend: trend.toFixed(1),
        trendDirection:
          trend > 10 ? "rising" : trend < -10 ? "falling" : "stable",
        totalMatches: playerMatches.length,
      };
    })
    .filter((t) => t !== null)
    .sort(
      (a, b) => Math.abs(parseFloat(b.trend)) - Math.abs(parseFloat(a.trend)),
    ); // Sort by biggest change

  if (playerTrends.length === 0) {
    container.innerHTML =
      '<p class="text-center text-muted">Not enough match data to show trends (need 5+ matches per player)</p>';
    return;
  }

  container.innerHTML = playerTrends
    .slice(0, 8) // Show top 8 trending players
    .map((trend) => {
      const trendIcon =
        trend.trendDirection === "rising"
          ? "📈"
          : trend.trendDirection === "falling"
            ? "📉"
            : "➡️";
      const trendClass =
        trend.trendDirection === "rising"
          ? "trend-up"
          : trend.trendDirection === "falling"
            ? "trend-down"
            : "trend-stable";

      let trendDescription = "";
      if (trend.trendDirection === "rising") {
        trendDescription = "Getting Better!";
      } else if (trend.trendDirection === "falling") {
        trendDescription = "Need Improvement";
      } else {
        trendDescription = "Steady Performance";
      }

      return `
    <div class="trend-card ${trendClass}">
      <div class="trend-player">
        <span class="trend-icon">${trendIcon}</span>
        <span class="trend-name">${trend.player.name}</span>
      </div>
      <div class="trend-description">${trendDescription}</div>
      <div class="trend-stats">
        <div class="trend-stat">
          <span class="trend-label">First ${trend.firstHalfMatches} matches</span>
          <span class="trend-value">${trend.firstHalfWinRate}%</span>
        </div>
        <div class="trend-arrow">→</div>
        <div class="trend-stat">
          <span class="trend-label">Last ${trend.secondHalfMatches} matches</span>
          <span class="trend-value">${trend.secondHalfWinRate}%</span>
        </div>
      </div>
      <div class="trend-change">
        ${parseFloat(trend.trend) > 0 ? "+" : ""}${trend.trend}% change
      </div>
    </div>
  `;
    })
    .join("");
}

function renderAchievements(playerStats) {
  const container = document.getElementById("achievements-container");

  if (state.matches.length === 0) {
    container.innerHTML =
      '<p class="text-center text-muted">No achievements yet - play some matches!</p>';
    return;
  }

  // Perfect games (21-0 or similar blowouts)
  const perfectGames = state.matches.filter(
    (m) =>
      Math.abs(m.team1_score - m.team2_score) >= 15 &&
      (m.team1_score >= 21 || m.team2_score >= 21),
  );
  const latestPerfect = perfectGames[perfectGames.length - 1];
  let perfectTeam = "N/A";
  if (latestPerfect) {
    const winners =
      latestPerfect.team1_score > latestPerfect.team2_score
        ? [latestPerfect.team1_player1_id, latestPerfect.team1_player2_id]
        : [latestPerfect.team2_player1_id, latestPerfect.team2_player2_id];
    perfectTeam = winners
      .map((id) => {
        const player = state.players.find((p) => String(p.id) === String(id));
        return player?.name || null;
      })
      .filter((name) => name)
      .join(" & ");
  }

  // Milestone tracker
  const milestones = [];
  playerStats.forEach((player) => {
    if (player.wins >= 100)
      milestones.push({ player: player.name, milestone: "100 Wins 🏆" });
    else if (player.wins >= 50)
      milestones.push({ player: player.name, milestone: "50 Wins 🥇" });
    else if (player.wins >= 25)
      milestones.push({ player: player.name, milestone: "25 Wins 🥈" });
    else if (player.wins >= 10)
      milestones.push({ player: player.name, milestone: "10 Wins 🥉" });
  });
  const topMilestone = milestones.sort((a, b) => {
    const order = {
      "100 Wins 🏆": 4,
      "50 Wins 🥇": 3,
      "25 Wins 🥈": 2,
      "10 Wins 🥉": 1,
    };
    return (order[b.milestone] || 0) - (order[a.milestone] || 0);
  })[0];

  // First blood (first player to get a win)
  const sortedMatches = [...state.matches].sort(
    (a, b) =>
      new Date(a.match_date) - new Date(b.match_date) ||
      new Date(a.created_at) - new Date(b.created_at),
  );
  let firstBlood = "N/A";
  if (sortedMatches.length > 0) {
    const firstMatch = sortedMatches[0];
    const winners =
      firstMatch.team1_score > firstMatch.team2_score
        ? [firstMatch.team1_player1_id, firstMatch.team1_player2_id]
        : [firstMatch.team2_player1_id, firstMatch.team2_player2_id];
    firstBlood = winners
      .map((id) => {
        const player = state.players.find((p) => String(p.id) === String(id));
        return player?.name || null;
      })
      .filter((name) => name)
      .join(" & ");
  }

  // Century club (100+ points scored)
  const centuryPlayers = playerStats.filter((p) => p.pointsFor >= 100);
  const topScorer = centuryPlayers.sort((a, b) => b.pointsFor - a.pointsFor)[0];

  // Iron man (most matches played)
  const ironMan = playerStats.reduce(
    (max, p) => (p.totalMatches > max.totalMatches ? p : max),
    playerStats[0] || {},
  );

  // Clutch rating (performance in tight games - within 3 points)
  const clutchStats = {};
  state.players.forEach((player) => {
    clutchStats[player.id] = { wins: 0, losses: 0 };
  });

  state.matches.forEach((match) => {
    const diff = Math.abs(match.team1_score - match.team2_score);
    if (diff <= 3) {
      const team1Won = match.team1_score > match.team2_score;
      [match.team1_player1_id, match.team1_player2_id].forEach((id) => {
        if (team1Won) clutchStats[id].wins++;
        else clutchStats[id].losses++;
      });
      [match.team2_player1_id, match.team2_player2_id].forEach((id) => {
        if (!team1Won) clutchStats[id].wins++;
        else clutchStats[id].losses++;
      });
    }
  });

  let clutchKing = null;
  let bestClutch = 0;
  Object.keys(clutchStats).forEach((playerId) => {
    const total = clutchStats[playerId].wins + clutchStats[playerId].losses;
    if (total >= 3) {
      const rate = clutchStats[playerId].wins / total;
      if (rate > bestClutch) {
        bestClutch = rate;
        clutchKing = playerId;
      }
    }
  });

  const clutch = clutchKing
    ? {
        player: state.players.find((p) => p.id === clutchKing)?.name,
        stats: clutchStats[clutchKing],
      }
    : null;

  container.innerHTML = `
    <div class="achievements-grid">
      <div class="achievement-card">
        <div class="achievement-icon">🎖️</div>
        <div class="achievement-content">
          <h4>Perfect Game</h4>
          <p class="achievement-team">${perfectTeam}</p>
          <p class="achievement-detail">${perfectGames.length} blowout ${perfectGames.length === 1 ? "victory" : "victories"} (15+ point margin)</p>
        </div>
      </div>
      
      <div class="achievement-card">
        <div class="achievement-icon">🏅</div>
        <div class="achievement-content">
          <h4>Top Milestone</h4>
          <p class="achievement-team">${topMilestone ? topMilestone.player : "No milestones yet"}</p>
          <p class="achievement-detail">${topMilestone ? topMilestone.milestone : "Get 10 wins to unlock"}</p>
        </div>
      </div>
      
      <div class="achievement-card">
        <div class="achievement-icon">🩸</div>
        <div class="achievement-content">
          <h4>First Blood</h4>
          <p class="achievement-team">${firstBlood}</p>
          <p class="achievement-detail">First team to ever win</p>
        </div>
      </div>
      
      <div class="achievement-card">
        <div class="achievement-icon">💯</div>
        <div class="achievement-content">
          <h4>Century Club</h4>
          <p class="achievement-team">${topScorer ? topScorer.name : "N/A"}</p>
          <p class="achievement-detail">${topScorer ? `${topScorer.pointsFor} total points` : "Score 100+ points to join"}</p>
        </div>
      </div>
      
      <div class="achievement-card">
        <div class="achievement-icon">💪</div>
        <div class="achievement-content">
          <h4>Iron Man</h4>
          <p class="achievement-team">${ironMan ? ironMan.name : "N/A"}</p>
          <p class="achievement-detail">${ironMan ? `${ironMan.totalMatches} matches played` : "No matches yet"}</p>
        </div>
      </div>
      
      <div class="achievement-card">
        <div class="achievement-icon">🔥</div>
        <div class="achievement-content">
          <h4>Clutch King</h4>
          <p class="achievement-team">${clutch ? clutch.player : "N/A"}</p>
          <p class="achievement-detail">${clutch ? `${clutch.stats.wins}-${clutch.stats.losses} in close games (≤3 pts)` : "Need 3+ close matches"}</p>
        </div>
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

document.addEventListener("DOMContentLoaded", async () => {
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

  // Load club info first, then load initial data
  showLoading();
  const club = await loadClubInfo();
  hideLoading();

  if (!club) {
    showToast(
      "Failed to load club information. Please check your configuration.",
      "error",
    );
    return;
  }

  // Load initial data (leaderboard is the landing page)
  loadLeaderboard();
});
