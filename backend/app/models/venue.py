"""
SQLAlchemy async model for the venues table.
"""

from sqlalchemy import Column, Integer, String, Text
from app.database import Base


class Venue(Base):
    """Cricket venue with pitch and historical scoring data."""
    __tablename__ = "venues"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    city = Column(String(50), nullable=False)
    country = Column(String(50), nullable=False)

    # Historical averages
    avg_first_innings_score_t20 = Column(Integer, nullable=True)
    avg_first_innings_score_odi = Column(Integer, nullable=True)

    # Wicket distribution percentages
    spin_wicket_percentage = Column(Integer, nullable=True)
    pace_wicket_percentage = Column(Integer, nullable=True)

    # Pitch characteristics
    typical_pitch_type = Column(String(20), nullable=True)   # spin/pace/flat/balanced
    notes = Column(Text, nullable=True)