"""
Selection router — the core endpoint of the application.
Endpoint:
  POST /api/selection/generate → orchestrates stat fetching, scoring,
                                  XI selection, Gemini analysis, and DB persistence.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.database import get_db
from app.models.player import Player
from app.models.venue import Venue
from app.models.selection import Selection
from app.schemas.match import MatchSetupRequest
from app.schemas.selection import SelectionResponse
from app.services.cricapi_service import fetch_player_stats
from app.services.scoring_service import calculate_player_score, MatchContext
from app.services.selection_service import select_playing_xi
from app.services.gemini_service import generate_selection_analysis

router = APIRouter(prefix="/api/selection", tags=["Selection"])


@router.post("/generate", response_model=SelectionResponse)
async def generate_selection(payload: MatchSetupRequest, db: AsyncSession = Depends(get_db)):
    """
    Main endpoint — full pipeline:
      1. Load players from DB by IDs provided
      2. Fetch / cache their stats via CricAPI
      3. Score each player using the weighted algorithm
      4. Select the optimal XI with balance constraints
      5. Call Gemini AI for human-readable analysis
      6. Persist the full result to the selections table
      7. Return the structured response
    """

    # ── 1. Load players ──────────────────────────────────────────────────────
    result = await db.execute(
        select(Player).where(Player.id.in_(payload.available_player_ids))
    )
    players = result.scalars().all()

    if len(players) < 11:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 11 available players. Got {len(players)}.",
        )

    # ── 2. Load venue ─────────────────────────────────────────────────────────
    venue = None
    if payload.venue_id:
        venue_result = await db.execute(select(Venue).where(Venue.id == payload.venue_id))
        venue = venue_result.scalar_one_or_none()

    # ── 3. Build match context ────────────────────────────────────────────────
    match_ctx = MatchContext(
        format=payload.format,
        pitch_type=payload.pitch_type,
        weather=payload.weather,
        toss_decision=payload.toss_decision,
        opposition=payload.opposition,
        team_name=payload.team_name,
    )

    # ── 4. Fetch stats + score each player ───────────────────────────────────
    scored_players = []
    for player in players:
        stats = await fetch_player_stats(
            player_id=player.id,
            cricapi_id=player.cricapi_id,
            format=payload.format,
            db=db,
        )
        score = calculate_player_score(player, stats, match_ctx)
        scored_players.append({
            "player": player,
            "stats": stats,
            "score": score,
        })

    # ── 5. Select XI with balance constraints ────────────────────────────────
    selected_xi_data = select_playing_xi(scored_players, payload.format)

    if len(selected_xi_data) < 11:
        raise HTTPException(
            status_code=422,
            detail="Could not form a balanced XI from the available players. "
                   "Ensure at least 1 wicketkeeper, 4 bowlers, and 3 batsmen are available.",
        )

    # ── 6. Gemini AI analysis ─────────────────────────────────────────────────
    ai_result = await generate_selection_analysis(
        selected_xi=selected_xi_data,
        match_context=match_ctx,
        venue=venue,
    )

    # ── 7. Identify captain & vice-captain (top 2 scorers among batsmen/allrounders) ──
    captain_candidates = sorted(
        [p for p in selected_xi_data if p["player"].role in ("batsman", "allrounder", "wicketkeeper")],
        key=lambda x: x["score"],
        reverse=True,
    )
    captain = captain_candidates[0] if len(captain_candidates) > 0 else selected_xi_data[0]
    vice_captain = captain_candidates[1] if len(captain_candidates) > 1 else selected_xi_data[1]

    captain_player = captain["player"]
    vc_player = vice_captain["player"]

    # ── 8. Build selected_xi response list ───────────────────────────────────
    selected_xi_response = []
    for idx, entry in enumerate(selected_xi_data):
        p = entry["player"]
        player_reasons = ai_result.get("player_reasons", {})
        selected_xi_response.append({
            "player_id": p.id,
            "name": p.name,
            "role": p.role,
            "score": entry["score"],
            "batting_position": idx + 1,
            "is_captain": p.id == captain_player.id,
            "is_vice_captain": p.id == vc_player.id,
            "selection_reason": player_reasons.get(p.name, "Selected based on current form and conditions."),
        })

    # ── 9. Build team balance summary ────────────────────────────────────────
    team_balance = {
        "batsmen": sum(1 for e in selected_xi_data if e["player"].role == "batsman"),
        "allrounders": sum(1 for e in selected_xi_data if e["player"].role == "allrounder"),
        "bowlers": sum(1 for e in selected_xi_data if e["player"].role == "bowler"),
        "wicketkeeper": sum(1 for e in selected_xi_data if e["player"].role == "wicketkeeper"),
    }

    # ── 10. Persist to DB ─────────────────────────────────────────────────────
    new_selection = Selection(
        format=payload.format,
        team_name=payload.team_name,
        opposition=payload.opposition,
        venue_id=payload.venue_id,
        pitch_type=payload.pitch_type,
        weather=payload.weather,
        toss_decision=payload.toss_decision,
        selected_xi=selected_xi_response,
        batting_order=selected_xi_response,                     # same order for now
        bowling_combination=[
            {"player_id": e["player"].id, "name": e["player"].name, "role": e["player"].role}
            for e in selected_xi_data if e["player"].role in ("bowler", "allrounder")
        ],
        captain_id=captain_player.id,
        vice_captain_id=vc_player.id,
        ai_analysis=ai_result.get("overall_analysis", ""),
        ai_strategy=ai_result.get("key_strategy", ""),
    )
    db.add(new_selection)
    await db.commit()
    await db.refresh(new_selection)

    # ── 11. Return response ───────────────────────────────────────────────────
    return {
        "selection_id": new_selection.id,
        "selected_xi": selected_xi_response,
        "batting_order": selected_xi_response,
        "bowling_combination": new_selection.bowling_combination,
        "captain": {"player_id": captain_player.id, "name": captain_player.name},
        "vice_captain": {"player_id": vc_player.id, "name": vc_player.name},
        "ai_analysis": ai_result.get("overall_analysis", ""),
        "ai_strategy": ai_result.get("key_strategy", ""),
        "batting_order_reasoning": ai_result.get("batting_order_reasoning", ""),
        "bowling_plan": ai_result.get("bowling_plan", ""),
        "captain_reason": ai_result.get("captain_reason", ""),
        "team_balance": team_balance,
    }