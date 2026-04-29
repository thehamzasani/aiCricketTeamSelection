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


# from pydantic import BaseModel
# from typing import Optional, List
# from datetime import datetime

# class PlayerStatsResponse(BaseModel):
#     id: int
#     player_id: int
#     format: str
#     matches: int = 0
#     batting_avg: float = 0.0
#     strike_rate: float = 0.0
#     runs_total: int = 0
#     highest_score: int = 0
#     centuries: int = 0
#     fifties: int = 0
#     bowling_avg: float = 0.0
#     bowling_economy: float = 0.0
#     bowling_strike_rate: float = 0.0
#     wickets_total: int = 0
#     best_bowling: Optional[str] = None
#     recent_form: Optional[List[int]] = None
#     recent_wickets: Optional[List[int]] = None
#     last_updated: Optional[datetime] = None

#     model_config = {"from_attributes": True}


# class PlayerResponse(BaseModel):
#     id: int
#     name: str
#     country: str
#     role: str
#     batting_style: Optional[str] = None
#     bowling_style: Optional[str] = None
#     cricapi_id: Optional[str] = None
#     image_url: Optional[str] = None
#     is_active: bool = True
#     # stats is Optional — if not loaded, returns None instead of crashing
#     stats: Optional[List[PlayerStatsResponse]] = None

#     model_config = {"from_attributes": True}






"""
schemas/player.py
-----------------
Pydantic v2 schemas for Player and PlayerStats serialization.

Schemas:
  PlayerStatsResponse  — outbound stats (read)
  PlayerResponse       — outbound player with nested stats + overall_score
  PlayerCreate         — inbound: create a new player
  PlayerUpdate         — inbound: partial update player info
  PlayerStatsUpsert    — inbound: create or update stats per format
  SquadAssign          — inbound: assign a player to a squad
  PlayerBrief          — lightweight player summary for dropdowns / squad lists
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# PlayerStats — read schema
# ---------------------------------------------------------------------------

class PlayerStatsResponse(BaseModel):
    """Full stats row returned to the client."""
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


# ---------------------------------------------------------------------------
# Player — read schema
# ---------------------------------------------------------------------------

class PlayerResponse(BaseModel):
    """
    Full player object returned to the client.
    Includes nested stats list and an overall_score computed server-side
    (used by the UI score meter on the Players Browse page).
    """
    id: int
    name: str
    country: str
    role: str
    batting_style: Optional[str] = None
    bowling_style: Optional[str] = None
    cricapi_id: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True
    overall_score: float = 0.0          # computed by list_players endpoint
    stats: Optional[List[PlayerStatsResponse]] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# PlayerBrief — lightweight summary for squad selectors / dropdowns
# ---------------------------------------------------------------------------

class PlayerBrief(BaseModel):
    """Minimal player info used in squad lists and selection dropdowns."""
    id: int
    name: str
    country: str
    role: str
    batting_style: Optional[str] = None
    bowling_style: Optional[str] = None
    image_url: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# PlayerCreate — create a new player
# ---------------------------------------------------------------------------

VALID_ROLES = {"batsman", "bowler", "allrounder", "wicketkeeper"}
VALID_BATTING_STYLES = {"right-hand", "left-hand"}
VALID_BOWLING_STYLES = {
    "right-arm fast",
    "right-arm medium",
    "right-arm off-spin",
    "left-arm fast",
    "left-arm medium",
    "left-arm spin",
    "leg spin",
    "n/a",
}

class PlayerCreate(BaseModel):
    """
    Payload for POST /api/players.
    All fields are validated for allowed values before DB insertion.
    """
    name: str = Field(..., min_length=2, max_length=100, description="Player's full name")
    country: str = Field(..., min_length=2, max_length=50, description="Player's country")
    role: str = Field(..., description="batsman / bowler / allrounder / wicketkeeper")
    batting_style: Optional[str] = Field(None, description="right-hand / left-hand")
    bowling_style: Optional[str] = Field(None, description="Bowling style or N/A")
    cricapi_id: Optional[str] = Field(None, description="CricAPI player UUID for live stat fetching")
    image_url: Optional[str] = Field(None, description="URL to player headshot image")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in VALID_ROLES:
            raise ValueError(f"Role must be one of: {', '.join(sorted(VALID_ROLES))}")
        return v

    @field_validator("batting_style")
    @classmethod
    def validate_batting_style(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip().lower()
        if v not in VALID_BATTING_STYLES:
            raise ValueError(f"Batting style must be one of: {', '.join(sorted(VALID_BATTING_STYLES))}")
        return v

    @field_validator("bowling_style")
    @classmethod
    def validate_bowling_style(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        normalized = v.strip().lower()
        if normalized not in VALID_BOWLING_STYLES:
            # Accept free-text for "other" styles but normalise case
            return v.strip()
        return normalized

    @field_validator("name", "country")
    @classmethod
    def strip_strings(cls, v: str) -> str:
        return v.strip()


# ---------------------------------------------------------------------------
# PlayerUpdate — partial update player info
# ---------------------------------------------------------------------------

class PlayerUpdate(BaseModel):
    """
    Payload for PUT /api/players/{player_id}.
    All fields are optional — only provided fields are updated (PATCH semantics).
    """
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    country: Optional[str] = Field(None, min_length=2, max_length=50)
    role: Optional[str] = None
    batting_style: Optional[str] = None
    bowling_style: Optional[str] = None
    cricapi_id: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip().lower()
        if v not in VALID_ROLES:
            raise ValueError(f"Role must be one of: {', '.join(sorted(VALID_ROLES))}")
        return v


# ---------------------------------------------------------------------------
# PlayerStatsUpsert — create or update stats per format
# ---------------------------------------------------------------------------

VALID_FORMATS = {"T20", "ODI", "Test"}

class PlayerStatsUpsert(BaseModel):
    """
    Payload for POST /api/players/{player_id}/stats.
    Upserts (insert or update) the stats row for the given format.

    Validation ranges:
      batting_avg      : 0 – 100
      strike_rate      : 0 – 300
      bowling_economy  : 0 – 15
      bowling_avg      : 0 – 100
      bowling_sr       : 0 – 200
      recent_form      : list of up to 5 non-negative integers
      recent_wickets   : list of up to 5 non-negative integers
    """
    format: str = Field(..., description="T20 / ODI / Test")
    matches: Optional[int] = Field(None, ge=0)
    batting_avg: Optional[float] = Field(None, ge=0.0, le=100.0)
    strike_rate: Optional[float] = Field(None, ge=0.0, le=300.0)
    runs_total: Optional[int] = Field(None, ge=0)
    highest_score: Optional[int] = Field(None, ge=0)
    centuries: Optional[int] = Field(None, ge=0)
    fifties: Optional[int] = Field(None, ge=0)
    bowling_avg: Optional[float] = Field(None, ge=0.0, le=200.0)
    bowling_economy: Optional[float] = Field(None, ge=0.0, le=30.0)
    bowling_strike_rate: Optional[float] = Field(None, ge=0.0, le=300.0)
    wickets_total: Optional[int] = Field(None, ge=0)
    best_bowling: Optional[str] = Field(None, max_length=10, description="e.g. 5/23")
    recent_form: Optional[List[int]] = Field(None, description="Last 5 batting scores")
    recent_wickets: Optional[List[int]] = Field(None, description="Last 5 match wickets")

    @field_validator("format")
    @classmethod
    def validate_format(cls, v: str) -> str:
        v = v.strip()
        if v not in VALID_FORMATS:
            raise ValueError(f"Format must be one of: {', '.join(sorted(VALID_FORMATS))}")
        return v

    @field_validator("recent_form", "recent_wickets")
    @classmethod
    def validate_recent_lists(cls, v: Optional[List[int]]) -> Optional[List[int]]:
        if v is None:
            return v
        if len(v) > 5:
            raise ValueError("Recent form / wickets list can have at most 5 entries.")
        if any(x < 0 for x in v):
            raise ValueError("Scores and wickets must be non-negative integers.")
        return v

    @field_validator("best_bowling")
    @classmethod
    def validate_best_bowling(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        # Accept formats like "5/23", "3/14", "0/12"
        import re
        if not re.match(r"^\d{1,2}/\d{1,3}$", v.strip()):
            raise ValueError("Best bowling must be in W/R format e.g. '5/23'")
        return v.strip()


# ---------------------------------------------------------------------------
# SquadAssign — assign player to a squad
# ---------------------------------------------------------------------------

VALID_SQUAD_TYPES = {"all_format", "T20", "ODI", "Test"}

class SquadAssign(BaseModel):
    """
    Payload for POST /api/players/{player_id}/assign-squad.
    Assigns (or re-confirms) a player's membership in a named squad.
    """
    team_name: str = Field(..., min_length=2, max_length=50, description="e.g. Pakistan")
    squad_type: Optional[str] = Field("all_format", description="all_format / T20 / ODI / Test")

    @field_validator("team_name")
    @classmethod
    def strip_team(cls, v: str) -> str:
        return v.strip()

    @field_validator("squad_type")
    @classmethod
    def validate_squad_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return "all_format"
        if v not in VALID_SQUAD_TYPES:
            raise ValueError(f"Squad type must be one of: {', '.join(sorted(VALID_SQUAD_TYPES))}")
        return v