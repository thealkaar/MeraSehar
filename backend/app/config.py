import os
from dotenv import load_dotenv

# Load env variables from a .env file if it exists
load_dotenv()

class Settings:
    PROJECT_NAME: str = "MeraShehar API"
    API_V1_STR: str = "/api/v1"
    
    # JWT Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "SUPER_SECRET_MERA_SHEHAR_KEY_12345!@#")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    
    # DB URL - If Postgres is not set, use SQLite for local dev
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./mera_shehar.db"
    )
    
    # Upload Settings
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    
    # Mock OTP verification code (if set, verify-otp accepts this code)
    MOCK_OTP_CODE: str = "123456"

settings = Settings()
