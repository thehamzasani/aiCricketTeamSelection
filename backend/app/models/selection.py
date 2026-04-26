"""
SQLAlchemy async model for the selections table (AI selection history).
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Selection(Base):
    """Persisted AI-generated Playing XI selection."""
    __tablename__ = "selections"

    id = Column(Integer, primary_key=True, index=True)
    format = Column(String(10), nullable=False)          # T20/ODI/Test
    team_name = Column(String(50), nullable=False)
    opposition = Column(String(50), nullable=False)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=True)
    pitch_type = Column(String(20), nullable=True)       # spin/pace/flat/balanced
    weather = Column(String(20), nullable=True)          # clear/overcast/humid
    toss_decision = Column(String(10), nullable=True)    # bat/bowl

    # JSONB columns for structured XI data
    selected_xi = Column(JSONB, nullable=False)          # array of player objects
    batting_order = Column(JSONB, nullable=True)         # ordered player list
    bowling_combination = Column(JSONB, nullable=True)  # bowlers with over allocation

    # Captain / vice-captain foreign keys
    captain_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    vice_captain_id = Column(Integer, ForeignKey("players.id"), nullable=True)

    # Gemini AI output
    ai_analysis = Column(Text, nullable=True)
    ai_strategy = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    venue = relationship("Venue")
    captain = relationship("Player", foreign_keys=[captain_id])
    vice_captain = relationship("Player", foreign_keys=[vice_captain_id])