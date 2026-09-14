from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Forge API"
    environment: str = "development"
    database_url: str = "sqlite:///./forge.db"
    agent_provider: str = "deterministic"
    openai_api_key: str = ""
    openai_model: str = "gpt-6-astra"
    cors_origins: str = "http://localhost:4174,http://127.0.0.1:4174"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="FORGE_",
        extra="ignore",
    )

    @property
    def allowed_origins(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
