# app/core/config.py

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # jo pehle se the:
    DEMO_JWT_SECRET: str
    DEMO_PASSWORD: str
    SUPABASE_JWT_SECRET: str

    # ✅ ERROR WAALE ENV VARS KO BHI ALLOW KAR LE
    DATABASE_URL: str | None = None
    SECRET_KEY: str | None = None

    # .env file location aur extra behavior
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",      # 👈 extra env vars pe error mat dikha
    )

settings = Settings()