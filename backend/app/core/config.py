from pydantic_settings import BaseSettings
from typing import Optional
import json


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "IDM System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    BACKEND_CORS_ORIGINS: str = '["http://localhost:3000"]'
    
    # Redis (for caching and celery)
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Email (optional, for notifications)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None

    # 2FA Settings
    TWOFA_CODE_EXPIRE_MINUTES: int = 5
    TWOFA_ADMIN_EMAIL: Optional[str] = None

    # Cookie Settings (for httpOnly JWT tokens)
    COOKIE_SECURE: bool = False  # Set to True in production with HTTPS
    COOKIE_SAMESITE: str = "lax"  # "strict", "lax", or "none"
    COOKIE_DOMAIN: Optional[str] = None  # None means current domain only

    # LDAP / Active Directory
    LDAP_ENABLED: bool = False
    LDAP_SERVER: str = ""
    LDAP_BASE_DN: str = ""
    LDAP_BIND_DN: str = ""
    LDAP_BIND_PASSWORD: str = ""
    LDAP_USER_SEARCH_BASE: Optional[str] = None  # If None, uses LDAP_BASE_DN
    LDAP_USER_FILTER: str = "(sAMAccountName={username})"
    LDAP_USE_SSL: bool = False
    LDAP_VERIFY_CERT: bool = False  # Set to True in production with proper CA cert
    LDAP_TIMEOUT: int = 10
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    # Access recertification
    RECERTIFICATION_PERIOD_MONTHS: int = 6

    # Web Push (VAPID) - keys should be set via environment variables
    # Generate new keys: npx web-push generate-vapid-keys
    VAPID_PUBLIC_KEY: str = ""  # Set via VAPID_PUBLIC_KEY env var
    VAPID_PRIVATE_KEY: str = ""  # Set via VAPID_PRIVATE_KEY env var
    VAPID_CLAIMS_EMAIL: str = "admin@idm-system.local"
    
    @property
    def cors_origins(self) -> list:
        """Parse CORS origins from string to list"""
        try:
            return json.loads(self.BACKEND_CORS_ORIGINS)
        except:
            return ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
