"""
Pydantic v2 schema for the match setup form — the input body of
POST /api/selection/generate.
"""

from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field


class MatchSetupRequest(BaseModel):
    """
    All parameters the frontend sends when requesting a Playing XI.
    available_player_ids must contain at least 11 IDs.
    """
    team_name: str = Field(..., examples=["Pakistan"])
    opposition: str = Field(..., examples=["India"])
    format: str = Field(..., pattern="^(T20|ODI|Test)$", examples=["T20"])
    venue_id: int = Field(..., gt=0)
    pitch_type: str = Field(..., pattern="^(spin|pace|flat|balanced)$", examples=["spin"])
    weather: str = Field(..., pattern="^(clear|overcast|humid)$", examples=["clear"])
    toss_decision: str = Field(..., pattern="^(bat|bowl)$", examples=["bat"])
    available_player_ids: List[int] = Field(
        ...,
        min_length=11,
        description="IDs of players available for selection (minimum 11)",
    )