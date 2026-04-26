"""
SQLAlchemy async models for the players and player_stats tables.
"""

from sqlalchemy import (
    Boolean, Column, DateTime, Integer, String, Text,
    ForeignKey, DECIMAL, ARRAY
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Player(Base):
    """Master player record."""
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    country = Column(String(50), nullable=False)
    role = Column(String(20), nullable=False)          # batsman/bowler/allrounder/wicketkeeper
    batting_style = Column(String(30), nullable=True)  # right-hand/left-hand
    bowling_style = Column(String(50), nullable=True)  # right-arm fast/left-arm spin/etc
    cricapi_id = Column(String(100), unique=True, nullable=True)
    image_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    stats = relationship("PlayerStats", back_populates="player", cascade="all, delete-orphan")
    squads = relationship("Squad", back_populates="player", cascade="all, delete-orphan")


class PlayerStats(Base):
    """Cached stats per player per format (T20/ODI/Test)."""
    __tablename__ = "player_stats"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    format = Column(String(10), nullable=False)               # T20/ODI/Test

    # Batting
    matches = Column(Integer, default=0)
    batting_avg = Column(DECIMAL(5, 2), default=0)
    strike_rate = Column(DECIMAL(6, 2), default=0)
    runs_total = Column(Integer, default=0)
    highest_score = Column(Integer, default=0)
    centuries = Column(Integer, default=0)
    fifties = Column(Integer, default=0)

    # Bowling
    bowling_avg = Column(DECIMAL(5, 2), default=0)
    bowling_economy = Column(DECIMAL(4, 2), default=0)
    bowling_strike_rate = Column(DECIMAL(5, 2), default=0)
    wickets_total = Column(Integer, default=0)
    best_bowling = Column(String(10), nullable=True)

    # Form arrays
    recent_form = Column(ARRAY(Integer), nullable=True)       # last 5 batting scores
    recent_wickets = Column(ARRAY(Integer), nullable=True)    # last 5 match wickets

    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    player = relationship("Player", back_populates="stats")

    __table_args__ = (
        # Composite unique constraint: one row per player per format
        __import__("sqlalchemy").UniqueConstraint("player_id", "format", name="uq_player_format"),
    )