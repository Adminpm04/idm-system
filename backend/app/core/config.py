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

    # LDAP / Active Directory
    LDAP_ENABLED: bool = True
    LDAP_SERVER: str = "ldap://172.18.69.3:389"
    LDAP_BASE_DN: str = "DC=corp,DC=orien,DC=tj"
    LDAP_BIND_DN: str = "tech_idm@corp.orien.tj"
    LDAP_BIND_PASSWORD: str = "02uTS3JkHhv62k9jzT2O"
    LDAP_USER_SEARCH_BASE: Optional[str] = None  # If None, uses LDAP_BASE_DN
    LDAP_USER_FILTER: str = "(sAMAccountName={username})"
    LDAP_USE_SSL: bool = False
    LDAP_TIMEOUT: int = 10
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    # Access recertification
    RECERTIFICATION_PERIOD_MONTHS: int = 6
    
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
