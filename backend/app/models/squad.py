"""
SQLAlchemy async model for the squads table (team ↔ player membership).
"""

from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Squad(Base):
    """Links a player to a named team squad."""
    __tablename__ = "squads"

    id = Column(Integer, primary_key=True, index=True)
    team_name = Column(String(50), nullable=False, index=True)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), nullable=False)
    squad_type = Column(String(20), default="all_format")   # all_format / T20 / ODI / Test

    # Relationships
    player = relationship("Player", back_populates="squads")

    __table_args__ = (
        UniqueConstraint("team_name", "player_id", name="uq_squad_team_player"),
    )