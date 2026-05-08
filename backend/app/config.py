# """
# config.py — Application settings loaded from environment variables.
# Uses pydantic-settings for type-safe env var parsing.
# """

# from pydantic_settings import BaseSettings
# from functools import lru_cache


# class Settings(BaseSettings):
#     """All application configuration sourced from .env file."""

#     # Database
#     database_url: str

#     # External APIs
#     cricapi_key: str
#     gemini_api_key: str

#     # App
#     environment: str = "development"
#     frontend_url: str = "http://localhost:5173"

#     # Cache TTL (seconds) — 24 hours
#     stats_cache_ttl_seconds: int = 86400

#     # CricAPI base URL
#     cricapi_base_url: str = "https://api.cricapi.com/v1"

#     class Config:
#         env_file = ".env"
#         env_file_encoding = "utf-8"


# @lru_cache()
# def get_settings() -> Settings:
#     """Return cached settings instance (singleton pattern)."""
#     return Settings()
# settings = get_settings()


"""
config.py — Centralised settings loaded from .env
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    cricapi_key: str = ""
    gemini_api_key: str = ""
    environment: str = "development"
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()