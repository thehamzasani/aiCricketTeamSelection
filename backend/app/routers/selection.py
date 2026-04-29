"""
Selection router — the core endpoint of the application.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.database import get_db
from app.models.player import Player, PlayerStats
from app.models.venue import Venue
from app.models.selection import Selection
from app.schemas.match import MatchSetupRequest
from app.schemas.selection import SelectionResponse

# ✅ Updated imports (NO CricAPI)
from app.services.scoring_service import (
    calculate_player_score,
    MatchContext,
    PlayerContext,
    StatsContext,
)
from app.services.selection_service import select_playing_xi, ScoredPlayer
from app.services.gemini_service import generate_selection_analysis

router = APIRouter(prefix="/api/selection", tags=["Selection"])


@router.post("/generate", response_model=SelectionResponse)
async def generate_selection(payload: MatchSetupRequest, db: AsyncSession = Depends(get_db)):

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

    # ── 4. Fetch stats from DB + score each player ───────────────────────────
    scored_players = []

    for player in players:
        # ✅ Fetch stats directly from DB
        stats_result = await db.execute(
            select(PlayerStats).where(
                PlayerStats.player_id == player.id,
                PlayerStats.format == payload.format.upper(),
            )
        )
        stats = stats_result.scalar_one_or_none()

        # ✅ Fallback empty stats (prevents crashes)
        if stats is None:
            stats = PlayerStats(
                player_id=player.id,
                format=payload.format.upper(),
                matches=0,
                batting_avg=0.0,
                strike_rate=0.0,
                runs_total=0,
                highest_score=0,
                centuries=0,
                fifties=0,
                bowling_avg=0.0,
                bowling_economy=0.0,
                bowling_strike_rate=0.0,
                wickets_total=0,
                best_bowling=None,
                recent_form=[],
                recent_wickets=[],
            )

        # ✅ Convert ORM → scoring dataclasses
        player_ctx = PlayerContext(
            player_id=player.id,
            name=player.name,
            role=player.role,
            bowling_style=player.bowling_style or "",
            batting_style=player.batting_style or "",
        )

        stats_ctx = StatsContext(
            matches=stats.matches or 0,
            batting_avg=float(stats.batting_avg or 0),
            strike_rate=float(stats.strike_rate or 0),
            runs_total=stats.runs_total or 0,
            highest_score=stats.highest_score or 0,
            centuries=stats.centuries or 0,
            fifties=stats.fifties or 0,
            bowling_avg=float(stats.bowling_avg or 0),
            bowling_economy=float(stats.bowling_economy or 0),
            bowling_strike_rate=float(stats.bowling_strike_rate or 0),
            wickets_total=stats.wickets_total or 0,
            best_bowling=stats.best_bowling,
            recent_form=stats.recent_form or [],
            recent_wickets=stats.recent_wickets or [],
        )

        # ✅ Correct scoring call
        score_result = calculate_player_score(player_ctx, stats_ctx, match_ctx)

        scored_players.append(
            ScoredPlayer(
                player=player_ctx,
                stats=stats_ctx,
                score=score_result["total_score"],
                breakdown=score_result["breakdown"],
                selection_reason=score_result["selection_reason"],
            )
        )

    # ── 5. Select XI ─────────────────────────────────────────────────────────
    selected_xi_data = select_playing_xi(scored_players, match_ctx)

    if len(selected_xi_data["selected_xi"]) < 11:
        raise HTTPException(
            status_code=422,
            detail="Could not form a balanced XI.",
        )

    # ── 6. Gemini AI analysis ─────────────────────────────────────────────────
    venue_dict = {
        "name": venue.name,
        "city": venue.city,
        "country": venue.country,
        "avg_first_innings_score_t20": venue.avg_first_innings_score_t20,
        "avg_first_innings_score_odi": venue.avg_first_innings_score_odi,
        "spin_wicket_percentage": venue.spin_wicket_percentage,
        "pace_wicket_percentage": venue.pace_wicket_percentage,
    } if venue else {}

    match_context_dict = {
        "format": match_ctx.format,
        "pitch_type": match_ctx.pitch_type,
        "weather": match_ctx.weather,
        "toss_decision": match_ctx.toss_decision,
        "opposition": match_ctx.opposition,
        "team_name": match_ctx.team_name,
    }

    ai_result = await generate_selection_analysis(
        selected_xi=selected_xi_data["selected_xi"],
        match_context=match_context_dict,
        venue=venue_dict,
    )

    # ── 7. Captain & Vice-Captain ─────────────────────────────────────────────
    xi_list = selected_xi_data["selected_xi"]
    captain_candidates = sorted(
        [p for p in xi_list if p["role"] in ("batsman", "allrounder", "wicketkeeper")],
        key=lambda x: x["score"],
        reverse=True,
    )

    captain = captain_candidates[0] if captain_candidates else xi_list[0]
    vice_captain = captain_candidates[1] if len(captain_candidates) > 1 else xi_list[1]

    captain_player = {"player_id": captain["player_id"], "name": captain["name"]}
    vc_player = {"player_id": vice_captain["player_id"], "name": vice_captain["name"]}

    # ── 8. Build response ─────────────────────────────────────────────────────
    xi_list = selected_xi_data["selected_xi"]
    selected_xi_response = []

    for idx, entry in enumerate(xi_list):
        player_reasons = ai_result.get("player_reasons", {})

        selected_xi_response.append({
            "player_id": entry["player_id"],
            "name": entry["name"],
            "role": entry["role"],
            "score": entry["score"],
            "batting_position": entry.get("batting_position", idx + 1),
            "is_captain": entry["player_id"] == captain_player["player_id"],
            "is_vice_captain": entry["player_id"] == vc_player["player_id"],
            "selection_reason": player_reasons.get(
                entry["name"],
                "Selected based on current form and conditions.",
            ),
            "batting_style": entry.get("batting_style", ""),
            "bowling_style": entry.get("bowling_style", ""),
        })

    # ── 9. Team balance ───────────────────────────────────────────────────────
    team_balance = {
        "batsmen": sum(1 for e in xi_list if e["role"] == "batsman"),
        "allrounders": sum(1 for e in xi_list if e["role"] == "allrounder"),
        "bowlers": sum(1 for e in xi_list if e["role"] == "bowler"),
        "wicketkeeper": sum(1 for e in xi_list if e["role"] == "wicketkeeper"),
    }

    # ── 10. Build bowling combination ─────────────────────────────────────────
    bowling_combination_list = []
    bowlers_and_allrounders = [e for e in xi_list if e["role"] in ("bowler", "allrounder")]
    
    # Allocate overs roughly equally among bowlers
    total_overs = 20 if match_ctx.format == "T20" else (50 if match_ctx.format == "ODI" else 90)
    overs_per_bowler = total_overs // max(1, len(bowlers_and_allrounders)) if bowlers_and_allrounders else 0
    
    for e in bowlers_and_allrounders:
        bowling_combination_list.append({
            "player_id": e["player_id"],
            "name": e["name"],
            "bowling_style": e.get("bowling_style", ""),
            "suggested_overs": overs_per_bowler,
            "economy_rate": None,
        })

    # ── 11. Save to DB ────────────────────────────────────────────────────────
    new_selection = Selection(
        format=payload.format,
        team_name=payload.team_name,
        opposition=payload.opposition,
        venue_id=payload.venue_id,
        pitch_type=payload.pitch_type,
        weather=payload.weather,
        toss_decision=payload.toss_decision,
        selected_xi=selected_xi_response,
        batting_order=selected_xi_response,
        bowling_combination=bowling_combination_list,
        captain_id=captain_player["player_id"],
        vice_captain_id=vc_player["player_id"],
        ai_analysis=ai_result.get("overall_analysis", ""),
        ai_strategy=ai_result.get("key_strategy", ""),
    )

    db.add(new_selection)
    await db.commit()
    await db.refresh(new_selection)

    # ── 12. Return ────────────────────────────────────────────────────────────
    return {
        "selection_id": new_selection.id,
        "selected_xi": selected_xi_response,
        "batting_order": selected_xi_response,
        "bowling_combination": bowling_combination_list,
        "captain": captain_player,
        "vice_captain": vc_player,
        "ai_analysis": ai_result.get("overall_analysis", ""),
        "ai_strategy": ai_result.get("key_strategy", ""),
        "team_balance": team_balance,
        "overall_analysis": ai_result.get("overall_analysis", ""),
        "player_reasons": ai_result.get("player_reasons", {}),
        "batting_order_reasoning": ai_result.get("batting_order_reasoning", ""),
        "bowling_plan": ai_result.get("bowling_plan", ""),
        "captain_reason": ai_result.get("captain_reason", ""),
        "key_strategy": ai_result.get("key_strategy", ""),
    }