from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@db:5432/finreminder"
    jwt_secret: str = "change-me-in-production"
    jwt_expire_minutes: int = 60 * 24 * 7
    admin_email: str = "admin@example.com"
    admin_password: str = "changeme"
    reminder_days: int = 7

    class Config:
        env_file = ".env"


settings = Settings()
