"""
selection_service.py
--------------------
Playing XI selection engine for AI Cricket Team Selection System.

Given a list of scored players, this service:
  1. Enforces BALANCE_RULES (min counts per role, exactly 1 WK, exactly 11 total)
  2. Greedily selects the highest-scoring players while satisfying constraints
  3. Falls back gracefully when role quotas can't be met from available players
  4. Returns the final XI sorted by role priority (opener → WK → batsman →
     allrounder → bowler) with batting positions pre-assigned
  5. Picks captain and vice-captain from the highest-scoring qualified players
"""

import logging
from copy import deepcopy
from dataclasses import dataclass, field
from typing import Optional

from app.services.scoring_service import MatchContext, PlayerContext, StatsContext

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Balance rules — exactly as specified in project instructions
# ---------------------------------------------------------------------------

BALANCE_RULES: dict[str, dict] = {
    "T20": {
        "wicketkeeper": 1,
        "batsman_min":   3,
        "bowler_min":    4,
        "allrounder_min": 1,
    },
    "ODI": {
        "wicketkeeper": 1,
        "batsman_min":   4,
        "bowler_min":    4,
        "allrounder_min": 1,
    },
    "Test": {
        "wicketkeeper": 1,
        "batsman_min":   5,
        "bowler_min":    4,
        "allrounder_min": 0,
    },
}

# Role display priority for sorting the final XI
ROLE_PRIORITY = {
    "batsman":      1,
    "wicketkeeper": 2,
    "allrounder":   3,
    "bowler":       4,
}

# Roles eligible to captain (bowlers rarely captain in limited-overs)
CAPTAIN_ELIGIBLE_ROLES = {"batsman", "wicketkeeper", "allrounder"}


# ---------------------------------------------------------------------------
# Data class for a scored, enriched player entry
# ---------------------------------------------------------------------------

@dataclass
class ScoredPlayer:
    """
    A player enriched with their composite score and contextual metadata,
    ready for selection processing.
    """
    player: PlayerContext
    stats: StatsContext
    score: float                           # 0-100 composite score
    breakdown: dict = field(default_factory=dict)
    selection_reason: str = ""

    # Populated after selection
    batting_position: Optional[int] = None
    is_captain: bool = False
    is_vice_captain: bool = False

    @property
    def role(self) -> str:
        return self.player.role.lower()

    @property
    def player_id(self) -> int:
        return self.player.player_id

    @property
    def name(self) -> str:
        return self.player.name


# ---------------------------------------------------------------------------
# Main selection function
# ---------------------------------------------------------------------------

def select_playing_xi(
    available_players: list[ScoredPlayer],
    match_context: MatchContext,
) -> dict:
    """
    Select the optimal Playing XI from a list of scored players.

    Algorithm
    ---------
    Phase 1 — Mandatory picks:
        a) Exactly 1 wicketkeeper (highest-scoring available)
        b) Fill minimum batsmen (best remaining batsmen by score)
        c) Fill minimum allrounders (best remaining allrounders)
        d) Fill minimum bowlers (best remaining bowlers)

    Phase 2 — Fill remaining slots (11 − mandatory picks) greedily:
        Pick highest-scoring players from the remaining pool regardless of role,
        respecting any remaining hard maximums (e.g. don't add a 2nd WK if 1 exists).

    Phase 3 — Fallback:
        If any mandatory quota can't be met (not enough players of that role),
        log a warning and fill with best available players of any role.

    Phase 4 — Assign batting order, captain, vice-captain.

    Parameters
    ----------
    available_players : list[ScoredPlayer]
        All players who are available for selection, already scored.
    match_context : MatchContext
        Format + pitch + weather — used to look up BALANCE_RULES.

    Returns
    -------
    dict with keys:
        "selected_xi"       : list[dict]  — 11 player result objects
        "batting_order"     : list[dict]  — ordered by batting position
        "bowling_combination": list[dict] — bowlers + allrounders
        "captain"           : dict
        "vice_captain"      : dict
        "team_balance"      : dict        — final role counts
        "warnings"          : list[str]   — any balance fallback messages
    """

    fmt = match_context.format
    if fmt not in BALANCE_RULES:
        raise ValueError(f"Unknown format '{fmt}'. Must be one of: {list(BALANCE_RULES)}")

    rules = BALANCE_RULES[fmt]
    warnings: list[str] = []

    # Work on a sorted copy (descending score) so greedy picks are always best-first
    pool: list[ScoredPlayer] = sorted(
        deepcopy(available_players), key=lambda p: p.score, reverse=True
    )

    selected: list[ScoredPlayer] = []
    selected_ids: set[int] = set()

    # -----------------------------------------------------------------------
    # Helper — pick N best players of a given role from the remaining pool
    # -----------------------------------------------------------------------

    def pick_best(role: str, n: int) -> list[ScoredPlayer]:
        """
        Pick the top-N highest-scoring players of `role` from the remaining pool.
        Removes chosen players from `pool` in-place.
        Returns however many were found (may be < n if pool exhausted).
        """
        chosen = []
        for sp in pool:
            if len(chosen) >= n:
                break
            if sp.role == role and sp.player_id not in selected_ids:
                chosen.append(sp)
        # Remove from pool
        for sp in chosen:
            pool.remove(sp)
            selected_ids.add(sp.player_id)
        return chosen

    def pick_best_any(n: int, exclude_roles: set[str] | None = None) -> list[ScoredPlayer]:
        """
        Pick the top-N highest-scoring players from the remaining pool,
        optionally excluding certain roles (e.g. avoid second WK).
        """
        exclude_roles = exclude_roles or set()
        chosen = []
        for sp in pool:
            if len(chosen) >= n:
                break
            if sp.role not in exclude_roles and sp.player_id not in selected_ids:
                chosen.append(sp)
        for sp in chosen:
            pool.remove(sp)
            selected_ids.add(sp.player_id)
        return chosen

    # -----------------------------------------------------------------------
    # Phase 1a — Wicketkeeper (always exactly 1)
    # -----------------------------------------------------------------------

    wk_picks = pick_best("wicketkeeper", rules["wicketkeeper"])
    if len(wk_picks) < rules["wicketkeeper"]:
        msg = (
            f"Only {len(wk_picks)} wicketkeeper(s) available; "
            f"needed {rules['wicketkeeper']}. Filling with best available."
        )
        logger.warning(msg)
        warnings.append(msg)
        # Fallback: grab best available regardless of role
        wk_picks += pick_best_any(rules["wicketkeeper"] - len(wk_picks))
    selected.extend(wk_picks)

    # -----------------------------------------------------------------------
    # Phase 1b — Minimum batsmen
    # -----------------------------------------------------------------------

    bat_picks = pick_best("batsman", rules["batsman_min"])
    if len(bat_picks) < rules["batsman_min"]:
        msg = (
            f"Only {len(bat_picks)} batsman available; "
            f"needed {rules['batsman_min']}. Filling with allrounders or any."
        )
        logger.warning(msg)
        warnings.append(msg)
        # Try allrounders first as batting cover
        extras = pick_best("allrounder", rules["batsman_min"] - len(bat_picks))
        bat_picks += extras
        if len(bat_picks) < rules["batsman_min"]:
            bat_picks += pick_best_any(rules["batsman_min"] - len(bat_picks))
    selected.extend(bat_picks)

    # -----------------------------------------------------------------------
    # Phase 1c — Minimum allrounders
    # -----------------------------------------------------------------------

    ar_picks = pick_best("allrounder", rules["allrounder_min"])
    if len(ar_picks) < rules["allrounder_min"]:
        msg = (
            f"Only {len(ar_picks)} allrounder(s) available; "
            f"needed {rules['allrounder_min']}."
        )
        logger.warning(msg)
        warnings.append(msg)
        ar_picks += pick_best_any(rules["allrounder_min"] - len(ar_picks))
    selected.extend(ar_picks)

    # -----------------------------------------------------------------------
    # Phase 1d — Minimum bowlers
    # -----------------------------------------------------------------------

    bowl_picks = pick_best("bowler", rules["bowler_min"])
    if len(bowl_picks) < rules["bowler_min"]:
        msg = (
            f"Only {len(bowl_picks)} bowler(s) available; "
            f"needed {rules['bowler_min']}."
        )
        logger.warning(msg)
        warnings.append(msg)
        bowl_picks += pick_best_any(rules["bowler_min"] - len(bowl_picks))
    selected.extend(bowl_picks)

    # -----------------------------------------------------------------------
    # Phase 2 — Fill remaining slots greedily (no second WK)
    # -----------------------------------------------------------------------

    slots_remaining = 11 - len(selected)
    if slots_remaining > 0:
        # Block a second wicketkeeper unless absolutely necessary
        filler = pick_best_any(slots_remaining, exclude_roles={"wicketkeeper"})
        if len(filler) < slots_remaining:
            # No choice but to add another WK if pool still has them
            filler += pick_best_any(slots_remaining - len(filler))
        selected.extend(filler)

    # -----------------------------------------------------------------------
    # Safety guard — trim to exactly 11 (shouldn't be needed but just in case)
    # -----------------------------------------------------------------------

    if len(selected) > 11:
        logger.warning(f"Selected {len(selected)} players; trimming to 11.")
        selected = selected[:11]

    if len(selected) < 11:
        msg = f"Could only select {len(selected)} players from available pool."
        logger.error(msg)
        warnings.append(msg)

    # -----------------------------------------------------------------------
    # Phase 3 — Assign batting positions
    # -----------------------------------------------------------------------

    _assign_batting_order(selected, match_context)

    # -----------------------------------------------------------------------
    # Phase 4 — Captain & Vice-Captain
    # -----------------------------------------------------------------------

    captain, vice_captain = _assign_leadership(selected)

    # -----------------------------------------------------------------------
    # Phase 5 — Build output dicts
    # -----------------------------------------------------------------------

    selected_xi_output = [_player_to_dict(sp) for sp in selected]
    batting_order_output = sorted(selected_xi_output, key=lambda p: p["batting_position"])
    bowling_combination = _build_bowling_combination(selected, match_context)

    team_balance = _compute_balance(selected)

    return {
        "selected_xi":         selected_xi_output,
        "batting_order":       batting_order_output,
        "bowling_combination": bowling_combination,
        "captain":             {"player_id": captain.player_id, "name": captain.name} if captain else None,
        "vice_captain":        {"player_id": vice_captain.player_id, "name": vice_captain.name} if vice_captain else None,
        "team_balance":        team_balance,
        "warnings":            warnings,
    }


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _assign_batting_order(players: list[ScoredPlayer], ctx: MatchContext) -> None:
    """
    Assign batting_position (1-11) based on role and scoring.

    Order philosophy:
        1-3  : Top batsmen / WK-batsman (highest batting scores)
        4-6  : Middle-order batsmen + allrounders
        7-8  : Lower-order allrounders / bowling allrounders
        9-11 : Specialist bowlers (sorted by batting_avg desc within group)
    """

    # Separate into groups
    openers_pool    = [p for p in players if p.role in ("batsman", "wicketkeeper")]
    allrounders     = [p for p in players if p.role == "allrounder"]
    bowlers         = [p for p in players if p.role == "bowler"]

    # Sort each group by batting avg descending within group
    openers_pool.sort(key=lambda p: (p.stats.batting_avg, p.score), reverse=True)
    allrounders.sort(key=lambda p: (p.stats.batting_avg, p.score), reverse=True)
    bowlers.sort(key=lambda p: (p.stats.batting_avg, p.score), reverse=True)

    ordered = openers_pool + allrounders + bowlers

    for pos, sp in enumerate(ordered, start=1):
        sp.batting_position = pos


def _assign_leadership(players: list[ScoredPlayer]) -> tuple[Optional[ScoredPlayer], Optional[ScoredPlayer]]:
    """
    Pick captain (highest scorer in eligible roles) and vice-captain
    (second highest, must be a different player).
    """
    eligible = [p for p in players if p.role in CAPTAIN_ELIGIBLE_ROLES]
    eligible.sort(key=lambda p: p.score, reverse=True)

    captain = eligible[0] if eligible else None
    vice_captain = eligible[1] if len(eligible) > 1 else None

    if captain:
        captain.is_captain = True
    if vice_captain:
        vice_captain.is_vice_captain = True

    return captain, vice_captain


def _build_bowling_combination(players: list[ScoredPlayer], ctx: MatchContext) -> list[dict]:
    """
    Build bowling combination with suggested over allocations.

    Total overs by format: T20 = 20, ODI = 50, Test = unlimited (represented as 0).
    Each bowler can bowl max 20% of overs (T20: 4, ODI: 10).
    Allrounders get half allocation.
    """
    FORMAT_OVERS = {"T20": 20, "ODI": 50, "Test": 0}
    total_overs = FORMAT_OVERS.get(ctx.format, 20)
    max_per_bowler = total_overs // 5  # 20% cap

    bowlers_in_xi = [p for p in players if p.role == "bowler"]
    allrounders_in_xi = [p for p in players if p.role == "allrounder"]

    bowling_combo = []

    for sp in sorted(bowlers_in_xi, key=lambda p: p.score, reverse=True):
        allocated_overs = max_per_bowler if total_overs > 0 else None
        bowling_combo.append({
            "player_id": sp.player_id,
            "name": sp.name,
            "bowling_style": sp.player.bowling_style or "Unknown",
            "economy": sp.stats.bowling_economy,
            "wickets_total": sp.stats.wickets_total,
            "suggested_overs": allocated_overs,
            "role": "bowler",
        })

    for sp in sorted(allrounders_in_xi, key=lambda p: p.stats.bowling_economy or 10, reverse=False):
        # Allrounders typically bowl half the maximum overs
        allocated_overs = max(1, max_per_bowler // 2) if total_overs > 0 else None
        bowling_combo.append({
            "player_id": sp.player_id,
            "name": sp.name,
            "bowling_style": sp.player.bowling_style or "Part-time",
            "economy": sp.stats.bowling_economy,
            "wickets_total": sp.stats.wickets_total,
            "suggested_overs": allocated_overs,
            "role": "allrounder",
        })

    return bowling_combo


def _compute_balance(players: list[ScoredPlayer]) -> dict:
    """Return role count summary for the selected XI."""
    balance = {"batsmen": 0, "allrounders": 0, "bowlers": 0, "wicketkeeper": 0}
    for sp in players:
        if sp.role == "batsman":
            balance["batsmen"] += 1
        elif sp.role == "allrounder":
            balance["allrounders"] += 1
        elif sp.role == "bowler":
            balance["bowlers"] += 1
        elif sp.role == "wicketkeeper":
            balance["wicketkeeper"] += 1
    return balance


def _player_to_dict(sp: ScoredPlayer) -> dict:
    """Serialise a ScoredPlayer to the API response format."""
    return {
        "player_id":        sp.player_id,
        "name":             sp.name,
        "role":             sp.role,
        "batting_style":    sp.player.batting_style or "",
        "bowling_style":    sp.player.bowling_style or "",
        "score":            sp.score,
        "breakdown":        sp.breakdown,
        "batting_position": sp.batting_position,
        "is_captain":       sp.is_captain,
        "is_vice_captain":  sp.is_vice_captain,
        "selection_reason": sp.selection_reason,
        "stats_snapshot": {
            "batting_avg":      sp.stats.batting_avg,
            "strike_rate":      sp.stats.strike_rate,
            "wickets_total":    sp.stats.wickets_total,
            "bowling_economy":  sp.stats.bowling_economy,
            "recent_form":      sp.stats.recent_form,
        },
    }
