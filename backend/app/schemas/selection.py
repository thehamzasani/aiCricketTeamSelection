"""
Pydantic v2 schemas for the AI selection response returned by
POST /api/selection/generate and GET /api/history/{id}.
"""

from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Sub-schemas
# ---------------------------------------------------------------------------

class SelectedPlayer(BaseModel):
    """A single player entry inside the selected XI."""
    player_id: int
    name: str
    role: str
    score: float
    batting_position: Optional[int] = None
    is_captain: bool = False
    is_vice_captain: bool = False
    selection_reason: Optional[str] = None
    bowling_style: Optional[str] = None
    batting_style: Optional[str] = None


class CaptainInfo(BaseModel):
    """Compact captain / vice-captain reference."""
    player_id: int
    name: str


class TeamBalance(BaseModel):
    """Breakdown of roles in the selected XI."""
    batsmen: int
    allrounders: int
    bowlers: int
    wicketkeeper: int


class BowlerAllocation(BaseModel):
    """Bowler with suggested over quota."""
    player_id: int
    name: str
    bowling_style: Optional[str] = None
    suggested_overs: int
    economy_rate: Optional[float] = None


# ---------------------------------------------------------------------------
# Main response schemas
# ---------------------------------------------------------------------------

class SelectionResponse(BaseModel):
    """
    Full response returned by POST /api/selection/generate.
    """
    selection_id: int
    selected_xi: List[SelectedPlayer]
    batting_order: List[SelectedPlayer]
    bowling_combination: List[BowlerAllocation]
    captain: CaptainInfo
    vice_captain: CaptainInfo
    ai_analysis: Optional[str] = None
    ai_strategy: Optional[str] = None
    team_balance: TeamBalance

    # Gemini structured breakdown (optional — populated when Gemini succeeds)
    overall_analysis: Optional[str] = None
    player_reasons: Optional[Dict[str, str]] = None
    batting_order_reasoning: Optional[str] = None
    bowling_plan: Optional[str] = None
    captain_reason: Optional[str] = None
    key_strategy: Optional[str] = None


class SelectionHistoryItem(BaseModel):
    """
    Lightweight summary shown in the History page list.
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    format: str
    team_name: str
    opposition: str
    pitch_type: Optional[str] = None
    weather: Optional[str] = None
    toss_decision: Optional[str] = None
    captain: Optional[CaptainInfo] = None
    created_at: datetime


class SelectionDetail(BaseModel):
    """
    Full selection detail for GET /api/history/{id}.
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    format: str
    team_name: str
    opposition: str
    venue_id: Optional[int] = None
    pitch_type: Optional[str] = None
    weather: Optional[str] = None
    toss_decision: Optional[str] = None
    selected_xi: List[Any]
    batting_order: Optional[List[Any]] = None
    bowling_combination: Optional[List[Any]] = None
    captain_id: Optional[int] = None
    vice_captain_id: Optional[int] = None
    ai_analysis: Optional[str] = None
    ai_strategy: Optional[str] = None
    created_at: datetime