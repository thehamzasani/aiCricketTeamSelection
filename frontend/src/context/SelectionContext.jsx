/**
 * context/SelectionContext.jsx
 *
 * Global state for the Cricket AI selection workflow.
 * Stores:
 *  - matchSetup      : current form values (team, venue, format, etc.)
 *  - availablePlayers: squad loaded from the backend
 *  - selectedPlayerIds: which player IDs the user has ticked
 *  - selectionResult : the full API response after generating XI
 *  - loading / error : async UI flags
 *
 * All pages and components import { useSelection } hook to read / update state.
 */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from 'react';

// ── Initial State ─────────────────────────────────────────────────────────────
const INITIAL_MATCH_SETUP = {
  team_name:            '',
  opposition:           '',
  format:               'T20',          // T20 | ODI | Test
  venue_id:             null,
  pitch_type:           'balanced',     // spin | pace | flat | balanced
  weather:              'clear',        // clear | overcast | humid
  toss_decision:        'bat',          // bat | bowl
};

const initialState = {
  // Match setup form values
  matchSetup: { ...INITIAL_MATCH_SETUP },

  // Players loaded from GET /api/squads/{team_name}
  availablePlayers: [],

  // IDs of players the user has checked/ticked
  selectedPlayerIds: [],

  // Full selection response from POST /api/selection/generate
  selectionResult: null,

  // The ID of the most recently generated selection (for navigation)
  lastSelectionId: null,

  // Async state
  loadingSquad:     false,
  loadingSelection: false,
  error:            null,
};

// ── Action Types ──────────────────────────────────────────────────────────────
const ACTIONS = {
  // Match setup
  SET_MATCH_FIELD:       'SET_MATCH_FIELD',
  RESET_MATCH_SETUP:     'RESET_MATCH_SETUP',

  // Player management
  SET_SQUAD_LOADING:     'SET_SQUAD_LOADING',
  SET_SQUAD:             'SET_SQUAD',
  TOGGLE_PLAYER:         'TOGGLE_PLAYER',
  SELECT_ALL_PLAYERS:    'SELECT_ALL_PLAYERS',
  DESELECT_ALL_PLAYERS:  'DESELECT_ALL_PLAYERS',

  // Selection result
  SET_SELECTION_LOADING: 'SET_SELECTION_LOADING',
  SET_SELECTION_RESULT:  'SET_SELECTION_RESULT',
  CLEAR_SELECTION:       'CLEAR_SELECTION',

  // Error handling
  SET_ERROR:             'SET_ERROR',
  CLEAR_ERROR:           'CLEAR_ERROR',
};

// ── Reducer ───────────────────────────────────────────────────────────────────
function selectionReducer(state, action) {
  switch (action.type) {

    // ── Match setup ──
    case ACTIONS.SET_MATCH_FIELD:
      return {
        ...state,
        matchSetup: {
          ...state.matchSetup,
          [action.field]: action.value,
        },
        error: null,
      };

    case ACTIONS.RESET_MATCH_SETUP:
      return {
        ...state,
        matchSetup: { ...INITIAL_MATCH_SETUP },
        availablePlayers:  [],
        selectedPlayerIds: [],
        selectionResult:   null,
        error:             null,
      };

    // ── Squad loading ──
    case ACTIONS.SET_SQUAD_LOADING:
      return {
        ...state,
        loadingSquad: action.loading,
        error: action.loading ? null : state.error,
      };

    case ACTIONS.SET_SQUAD:
      return {
        ...state,
        availablePlayers:  action.players,
        // Default: all players selected
        selectedPlayerIds: action.players.map((p) => p.id),
        loadingSquad:      false,
        error:             null,
      };

    // ── Player checkboxes ──
    case ACTIONS.TOGGLE_PLAYER: {
      const id = action.playerId;
      const already = state.selectedPlayerIds.includes(id);
      return {
        ...state,
        selectedPlayerIds: already
          ? state.selectedPlayerIds.filter((pid) => pid !== id)
          : [...state.selectedPlayerIds, id],
      };
    }

    case ACTIONS.SELECT_ALL_PLAYERS:
      return {
        ...state,
        selectedPlayerIds: state.availablePlayers.map((p) => p.id),
      };

    case ACTIONS.DESELECT_ALL_PLAYERS:
      return {
        ...state,
        selectedPlayerIds: [],
      };

    // ── Selection result ──
    case ACTIONS.SET_SELECTION_LOADING:
      return {
        ...state,
        loadingSelection: action.loading,
        error: action.loading ? null : state.error,
      };

    case ACTIONS.SET_SELECTION_RESULT:
      return {
        ...state,
        selectionResult:  action.result,
        lastSelectionId:  action.result?.selection_id ?? null,
        loadingSelection: false,
        error:            null,
      };

    case ACTIONS.CLEAR_SELECTION:
      return {
        ...state,
        selectionResult: null,
        lastSelectionId: null,
      };

    // ── Error ──
    case ACTIONS.SET_ERROR:
      return {
        ...state,
        error:            action.message,
        loadingSquad:     false,
        loadingSelection: false,
      };

    case ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
const SelectionContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────────
/**
 * Wrap your app (or subtree) with this provider to enable the selection context.
 */
export function SelectionProvider({ children }) {
  const [state, dispatch] = useReducer(selectionReducer, initialState);

  // ── Actions exposed to consumers ──────────────────────────────────────────

  /** Update a single field in the match setup form. */
  const setMatchField = useCallback((field, value) => {
    dispatch({ type: ACTIONS.SET_MATCH_FIELD, field, value });
  }, []);

  /** Reset the entire match setup form to defaults. */
  const resetMatchSetup = useCallback(() => {
    dispatch({ type: ACTIONS.RESET_MATCH_SETUP });
  }, []);

  /** Signal that squad is being loaded from the API. */
  const setSquadLoading = useCallback((loading) => {
    dispatch({ type: ACTIONS.SET_SQUAD_LOADING, loading });
  }, []);

  /** Store the loaded squad players (selects all by default). */
  const setSquad = useCallback((players) => {
    dispatch({ type: ACTIONS.SET_SQUAD, players });
  }, []);

  /** Toggle a player's selected state. */
  const togglePlayer = useCallback((playerId) => {
    dispatch({ type: ACTIONS.TOGGLE_PLAYER, playerId });
  }, []);

  /** Select all available players. */
  const selectAllPlayers = useCallback(() => {
    dispatch({ type: ACTIONS.SELECT_ALL_PLAYERS });
  }, []);

  /** Deselect all players. */
  const deselectAllPlayers = useCallback(() => {
    dispatch({ type: ACTIONS.DESELECT_ALL_PLAYERS });
  }, []);

  /** Signal that XI generation is in progress. */
  const setSelectionLoading = useCallback((loading) => {
    dispatch({ type: ACTIONS.SET_SELECTION_LOADING, loading });
  }, []);

  /** Store the AI selection result. */
  const setSelectionResult = useCallback((result) => {
    dispatch({ type: ACTIONS.SET_SELECTION_RESULT, result });
  }, []);

  /** Clear the current selection result. */
  const clearSelection = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_SELECTION });
  }, []);

  /** Set a user-visible error message. */
  const setError = useCallback((message) => {
    dispatch({ type: ACTIONS.SET_ERROR, message });
  }, []);

  /** Dismiss the current error. */
  const clearError = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ERROR });
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────

  /** Number of currently selected players. */
  const selectedCount = state.selectedPlayerIds.length;

  /** True if the user has selected at least 11 players. */
  const canGenerate = selectedCount >= 11;

  /** True if a player ID is in the selected set. */
  const isPlayerSelected = useCallback(
    (playerId) => state.selectedPlayerIds.includes(playerId),
    [state.selectedPlayerIds],
  );

  // ── Memoised context value ─────────────────────────────────────────────────
  const value = useMemo(
    () => ({
      // State
      ...state,

      // Derived
      selectedCount,
      canGenerate,
      isPlayerSelected,

      // Actions
      setMatchField,
      resetMatchSetup,
      setSquadLoading,
      setSquad,
      togglePlayer,
      selectAllPlayers,
      deselectAllPlayers,
      setSelectionLoading,
      setSelectionResult,
      clearSelection,
      setError,
      clearError,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
/**
 * useSelection — consume the SelectionContext.
 * Must be used inside a <SelectionProvider>.
 *
 * @example
 *   const { matchSetup, setMatchField, canGenerate } = useSelection();
 */
export function useSelection() {
  const ctx = useContext(SelectionContext);

  if (!ctx) {
    throw new Error(
      'useSelection must be used inside a <SelectionProvider>. ' +
      'Wrap your app (or the relevant subtree) with <SelectionProvider>.',
    );
  }

  return ctx;
}

export default SelectionContext;
