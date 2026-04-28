# """
# Pydantic v2 schemas for Player and PlayerStats request/response serialization.
# """

# from __future__ import annotations
# from datetime import datetime
# from decimal import Decimal
# from typing import List, Optional
# from pydantic import BaseModel, ConfigDict


# # ---------------------------------------------------------------------------
# # PlayerStats schemas
# # ---------------------------------------------------------------------------

# class PlayerStatsBase(BaseModel):
#     """Fields shared by create and read schemas."""
#     format: str
#     matches: int = 0
#     batting_avg: Decimal = Decimal("0")
#     strike_rate: Decimal = Decimal("0")
#     runs_total: int = 0
#     highest_score: int = 0
#     centuries: int = 0
#     fifties: int = 0
#     bowling_avg: Decimal = Decimal("0")
#     bowling_economy: Decimal = Decimal("0")
#     bowling_strike_rate: Decimal = Decimal("0")
#     wickets_total: int = 0
#     best_bowling: Optional[str] = None
#     recent_form: Optional[List[int]] = None
#     recent_wickets: Optional[List[int]] = None


# class PlayerStatsCreate(PlayerStatsBase):
#     """Schema for creating/updating stats (includes player_id)."""
#     player_id: int


# class PlayerStatsResponse(PlayerStatsBase):
#     """Schema returned to the client — includes PK and timestamp."""
#     model_config = ConfigDict(from_attributes=True)

#     id: int
#     player_id: int
#     last_updated: datetime


# # ---------------------------------------------------------------------------
# # Player schemas
# # ---------------------------------------------------------------------------

# class PlayerBase(BaseModel):
#     """Core player fields."""
#     name: str
#     country: str
#     role: str                             # batsman/bowler/allrounder/wicketkeeper
#     batting_style: Optional[str] = None
#     bowling_style: Optional[str] = None
#     cricapi_id: Optional[str] = None
#     image_url: Optional[str] = None
#     is_active: bool = True


# class PlayerCreate(PlayerBase):
#     """Schema for creating a new player (no id yet)."""
#     pass


# class PlayerResponse(PlayerBase):
#     """Schema returned to the client — includes PK and nested stats."""
#     model_config = ConfigDict(from_attributes=True)

#     id: int
#     created_at: datetime
#     stats: List[PlayerStatsResponse] = []


# class PlayerBrief(BaseModel):
#     """Lightweight player summary for squad lists and dropdowns."""
#     model_config = ConfigDict(from_attributes=True)

#     id: int
#     name: str
#     country: str
#     role: str
#     batting_style: Optional[str] = None
#     bowling_style: Optional[str] = None
#     image_url: Optional[str] = None


from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PlayerStatsResponse(BaseModel):
    id: int
    player_id: int
    format: str
    matches: int = 0
    batting_avg: float = 0.0
    strike_rate: float = 0.0
    runs_total: int = 0
    highest_score: int = 0
    centuries: int = 0
    fifties: int = 0
    bowling_avg: float = 0.0
    bowling_economy: float = 0.0
    bowling_strike_rate: float = 0.0
    wickets_total: int = 0
    best_bowling: Optional[str] = None
    recent_form: Optional[List[int]] = None
    recent_wickets: Optional[List[int]] = None
    last_updated: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PlayerResponse(BaseModel):
    id: int
    name: str
    country: str
    role: str
    batting_style: Optional[str] = None
    bowling_style: Optional[str] = None
    cricapi_id: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True
    # stats is Optional — if not loaded, returns None instead of crashing
    stats: Optional[List[PlayerStatsResponse]] = None

    model_config = {"from_attributes": True}