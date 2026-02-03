# app/core/config.py

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Core auth / external service settings
    SUPABASE_JWT_SECRET: str

    SUPABASE_URL: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None  # service_role key (optional)
    SUPABASE_ANON_KEY: str | None = None
    SUPABASE_JWKS_URL: str | None = None
    
    # Pilot School Defaults
    PILOT_SCHOOL_DOMAIN: str = "pilot.school"  # Fake domain for emails
    

    # ✅ ERROR WAALE ENV VARS KO BHI ALLOW KAR LE
    DATABASE_URL: str | None = None
    SECRET_KEY: str | None = None

    # .env file location aur extra behavior
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",      # 👈 extra env vars pe error mat dikha
    )

settings = Settings()
