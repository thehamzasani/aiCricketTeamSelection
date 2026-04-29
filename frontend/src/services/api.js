// /**
//  * services/api.js
//  * Centralised API layer — all backend communication goes through here.
//  *
//  * Uses a configured Axios instance so that:
//  *  - The base URL is read from the VITE_API_BASE_URL env variable
//  *  - Every request includes Content-Type: application/json
//  *  - Request/response interceptors handle auth tokens and global errors
//  *
//  * Usage:
//  *   import { squadAPI, selectionAPI } from '@/services/api';
//  *   const squad = await squadAPI.getSquad('Pakistan');
//  */

// import axios from 'axios';

// // ── Axios Instance ────────────────────────────────────────────────────────────

// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
//   headers: {
//     'Content-Type': 'application/json',
//   },
//   // 30-second timeout — AI generation can be slow
//   timeout: 30_000,
// });

// // ── Request Interceptor ───────────────────────────────────────────────────────
// // Attach auth token from localStorage when present (for future auth support)
// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('sb-auth-token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error),
// );

// // ── Response Interceptor ──────────────────────────────────────────────────────
// // Normalise errors: attach a human-friendly `message` to every rejected promise
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response) {
//       // Server responded with a non-2xx status
//       const detail = error.response.data?.detail;
//       const status = error.response.status;

//       if (typeof detail === 'string') {
//         error.friendlyMessage = detail;
//       } else if (Array.isArray(detail)) {
//         // FastAPI validation errors are arrays
//         error.friendlyMessage = detail.map((d) => d.msg).join(', ');
//       } else if (status === 404) {
//         error.friendlyMessage = 'Resource not found.';
//       } else if (status === 422) {
//         error.friendlyMessage = 'Invalid request — please check your inputs.';
//       } else if (status >= 500) {
//         error.friendlyMessage = 'Server error — please try again later.';
//       } else {
//         error.friendlyMessage = `Request failed (${status}).`;
//       }
//     } else if (error.code === 'ECONNABORTED') {
//       error.friendlyMessage = 'Request timed out — the AI might be busy. Please try again.';
//     } else {
//       error.friendlyMessage = 'Network error — check your connection.';
//     }

//     return Promise.reject(error);
//   },
// );

// // ── Helper ────────────────────────────────────────────────────────────────────
// /**
//  * Unwrap Axios response so callers get data directly.
//  * @param {Promise} promise - Axios request promise
//  * @returns {Promise<any>} Resolved with response.data
//  */
// const unwrap = (promise) => promise.then((res) => res.data);

// // =============================================================================
// // ── SQUADS API ────────────────────────────────────────────────────────────────
// // =============================================================================
// export const squadAPI = {
//   /**
//    * Fetch all players in a named squad.
//    * GET /api/squads/{team_name}
//    * @param {string} teamName - e.g. "Pakistan"
//    * @returns {Promise<Player[]>}
//    */
//   getSquad: (teamName) =>
//     unwrap(api.get(`/api/squads/${encodeURIComponent(teamName)}`)),

//   /**
//    * Get list of all available team names.
//    * GET /api/squads
//    * @returns {Promise<string[]>}
//    */
//   getTeamNames: () =>
//     unwrap(api.get('/api/squads')),
// };

// // =============================================================================
// // ── PLAYERS API ───────────────────────────────────────────────────────────────
// // =============================================================================
// export const playerAPI = {
//   /**
//    * Fetch all players (optionally filtered by team/role).
//    * GET /api/players?team=Pakistan&role=batsman
//    * @param {Object} params - Optional query filters {team, role, format}
//    * @returns {Promise<Player[]>}
//    */
//   getPlayers: (params = {}) =>
//     unwrap(api.get('/api/players', { params })),

//   /**
//    * Fetch cached or live stats for a single player.
//    * GET /api/players/{player_id}/stats?format=T20
//    * @param {number} playerId
//    * @param {string} format - "T20" | "ODI" | "Test"
//    * @returns {Promise<PlayerStats>}
//    */
//   getPlayerStats: (playerId, format = 'T20') =>
//     unwrap(api.get(`/api/players/${playerId}/stats`, { params: { format } })),
// };

// // =============================================================================
// // ── VENUES API ────────────────────────────────────────────────────────────────
// // =============================================================================
// export const venueAPI = {
//   /**
//    * Fetch list of all venues.
//    * GET /api/venues
//    * @returns {Promise<Venue[]>}
//    */
//   getVenues: () =>
//     unwrap(api.get('/api/venues')),

//   /**
//    * Fetch a single venue with full details.
//    * GET /api/venues/{venue_id}
//    * @param {number} venueId
//    * @returns {Promise<Venue>}
//    */
//   getVenue: (venueId) =>
//     unwrap(api.get(`/api/venues/${venueId}`)),
// };

// // =============================================================================
// // ── SELECTION API ─────────────────────────────────────────────────────────────
// // =============================================================================
// export const selectionAPI = {
//   /**
//    * Main endpoint — generate an AI-powered Playing XI.
//    * POST /api/selection/generate
//    *
//    * @param {Object} matchSetup
//    * @param {string}   matchSetup.team_name            - e.g. "Pakistan"
//    * @param {string}   matchSetup.opposition            - e.g. "India"
//    * @param {string}   matchSetup.format                - "T20" | "ODI" | "Test"
//    * @param {number}   matchSetup.venue_id
//    * @param {string}   matchSetup.pitch_type            - "spin" | "pace" | "flat" | "balanced"
//    * @param {string}   matchSetup.weather               - "clear" | "overcast" | "humid"
//    * @param {string}   matchSetup.toss_decision         - "bat" | "bowl"
//    * @param {number[]} matchSetup.available_player_ids  - array of player IDs (min 11)
//    *
//    * @returns {Promise<SelectionResult>}
//    */
//   generateXI: (matchSetup) =>
//     unwrap(api.post('/api/selection/generate', matchSetup)),
// };

// // =============================================================================
// // ── HISTORY API ───────────────────────────────────────────────────────────────
// // =============================================================================
// export const historyAPI = {
//   /**
//    * Fetch all past selections (most recent first).
//    * GET /api/history?team=Pakistan&format=T20&limit=20&offset=0
//    * @param {Object} params - Optional filters {team, format, limit, offset}
//    * @returns {Promise<SelectionSummary[]>}
//    */
//   getHistory: (params = {}) =>
//     unwrap(api.get('/api/history', { params })),

//   /**
//    * Fetch a single selection by ID.
//    * GET /api/history/{selection_id}
//    * @param {number} selectionId
//    * @returns {Promise<SelectionResult>}
//    */
//   getSelectionById: (selectionId) =>
//     unwrap(api.get(`/api/history/${selectionId}`)),
// };

// // =============================================================================
// // ── ADMIN API (dev only) ──────────────────────────────────────────────────────
// // =============================================================================
// export const adminAPI = {
//   /**
//    * Trigger seed data insertion (development only).
//    * POST /api/admin/seed
//    * @returns {Promise<{message: string}>}
//    */
//   seedDatabase: () =>
//     unwrap(api.post('/api/admin/seed')),

//   /**
//    * Pre-cache all player stats for a team (run before a demo).
//    * POST /api/admin/precache/{team_name}
//    * @param {string} teamName
//    * @returns {Promise<{message: string, cached_count: number}>}
//    */
//   precacheStats: (teamName) =>
//     unwrap(api.post(`/api/admin/precache/${encodeURIComponent(teamName)}`)),
// };
// export const fetchVenues = async () => {
//   const { data } = await api.get("/api/venues");
//   return data;
// };

// export const fetchSquad = async (teamName) => {
//   const { data } = await api.get(`/api/squads/${teamName}`);
//   return data;
// };

// export const generateSelection = async (payload) => {
//   const { data } = await api.post("/api/selection/generate", payload);
//   return data;
// };

// export const getSelectionById = async (id) => {
//   const response = await apiClient.get(`/api/history/${id}`);
//   return response.data;
// };
// // ── Named export of raw instance (for custom calls) ───────────────────────────
// export { api };
















/**
 * services/api.js
 * Centralised API layer — all backend communication goes through here.
 *
 * Uses a configured Axios instance so that:
 *  - The base URL is read from the VITE_API_BASE_URL env variable
 *  - Every request includes Content-Type: application/json
 *  - Request/response interceptors handle auth tokens and global errors
 */

import axios from 'axios';

// ── Axios Instance ────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000, // 30s — AI generation can be slow
});

// ── Request Interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sb-auth-token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor ──────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const detail = error.response.data?.detail;
      const status = error.response.status;
      if (typeof detail === 'string') {
        error.friendlyMessage = detail;
      } else if (Array.isArray(detail)) {
        error.friendlyMessage = detail.map((d) => d.msg).join(', ');
      } else if (status === 404) {
        error.friendlyMessage = 'Resource not found.';
      } else if (status === 409) {
        error.friendlyMessage = error.response.data?.detail || 'This record already exists.';
      } else if (status === 422) {
        error.friendlyMessage = 'Invalid request — please check your inputs.';
      } else if (status >= 500) {
        error.friendlyMessage = 'Server error — please try again later.';
      } else {
        error.friendlyMessage = `Request failed (${status}).`;
      }
    } else if (error.code === 'ECONNABORTED') {
      error.friendlyMessage = 'Request timed out — the AI might be busy. Please try again.';
    } else {
      error.friendlyMessage = 'Network error — check your connection.';
    }
    return Promise.reject(error);
  },
);

// ── Helper ────────────────────────────────────────────────────────────────────
/** Unwrap Axios response so callers get data directly. */
const unwrap = (promise) => promise.then((res) => res.data);

// =============================================================================
// ── SQUADS API ────────────────────────────────────────────────────────────────
// =============================================================================
export const squadAPI = {
  /**
   * Fetch all players in a named squad.
   * GET /api/squads/{team_name}
   */
  getSquad: (teamName) =>
    unwrap(api.get(`/api/squads/${encodeURIComponent(teamName)}`)),

  /**
   * Get list of all available team names.
   * GET /api/squads
   */
  getTeamNames: () => unwrap(api.get('/api/squads')),
};

// =============================================================================
// ── PLAYERS API ───────────────────────────────────────────────────────────────
// =============================================================================
export const playerAPI = {
  /**
   * Fetch all active players, optionally filtered.
   * GET /api/players?country=Pakistan&role=batsman
   */
  getPlayers: (params = {}) =>
    unwrap(api.get('/api/players', { params })),

  /**
   * Fetch stats for a single player in a given format.
   * GET /api/players/{player_id}/stats?format=T20
   */
  getPlayerStats: (playerId, format = 'T20') =>
    unwrap(api.get(`/api/players/${playerId}/stats`, { params: { format } })),

  /**
   * Create a new player.
   * POST /api/players
   * Body: { name, country, role, batting_style, bowling_style, cricapi_id? }
   */
  createPlayer: (playerData) =>
    unwrap(api.post('/api/players', playerData)),

  /**
   * Update player info (partial update — only provided fields change).
   * PUT /api/players/{player_id}
   */
  updatePlayer: (playerId, playerData) =>
    unwrap(api.put(`/api/players/${playerId}`, playerData)),

  /**
   * Soft-delete a player (sets is_active = false).
   * DELETE /api/players/{player_id}
   */
  deletePlayer: (playerId) =>
    unwrap(api.delete(`/api/players/${playerId}`)),

  /**
   * Upsert (create or update) stats for a player in a specific format.
   * POST /api/players/{player_id}/stats
   * Body: { format, matches, batting_avg, strike_rate, ... }
   */
  upsertPlayerStats: (playerId, statsData) =>
    unwrap(api.post(`/api/players/${playerId}/stats`, statsData)),

  /**
   * Assign a player to a named squad.
   * POST /api/players/{player_id}/assign-squad
   * Body: { team_name, squad_type? }
   */
  assignToSquad: (playerId, teamName, squadType = 'all_format') =>
    unwrap(
      api.post(`/api/players/${playerId}/assign-squad`, {
        team_name: teamName,
        squad_type: squadType,
      }),
    ),
};

// =============================================================================
// ── VENUES API ────────────────────────────────────────────────────────────────
// =============================================================================
export const venueAPI = {
  /** GET /api/venues */
  getVenues: () => unwrap(api.get('/api/venues')),
  /** GET /api/venues/{venue_id} */
  getVenue: (venueId) => unwrap(api.get(`/api/venues/${venueId}`)),
};

// =============================================================================
// ── SELECTION API ─────────────────────────────────────────────────────────────
// =============================================================================
export const selectionAPI = {
  /**
   * Generate an AI-powered Playing XI.
   * POST /api/selection/generate
   */
  generateXI: (matchSetup) =>
    unwrap(api.post('/api/selection/generate', matchSetup)),
};

// =============================================================================
// ── HISTORY API ───────────────────────────────────────────────────────────────
// =============================================================================
export const historyAPI = {
  /** GET /api/history */
  getHistory: (params = {}) => unwrap(api.get('/api/history', { params })),
  /** GET /api/history/{selection_id} */
  getSelectionById: (selectionId) =>
    unwrap(api.get(`/api/history/${selectionId}`)),
};

// =============================================================================
// ── ADMIN API (dev only) ──────────────────────────────────────────────────────
// =============================================================================
export const adminAPI = {
  /** POST /api/admin/seed */
  seedDatabase: () => unwrap(api.post('/api/admin/seed')),
  /** POST /api/admin/precache/{team_name} */
  precacheStats: (teamName) =>
    unwrap(api.post(`/api/admin/precache/${encodeURIComponent(teamName)}`)),
};

// ── Legacy named exports (used by SelectTeamPage / ResultPage) ────────────────
export const fetchVenues      = () => venueAPI.getVenues();
export const fetchSquad       = (teamName) => squadAPI.getSquad(teamName);
export const generateSelection = (payload) => selectionAPI.generateXI(payload);
export const getSelectionById  = (id) => historyAPI.getSelectionById(id);

// ── Named export of raw instance (for one-off custom calls) ──────────────────
export { api };