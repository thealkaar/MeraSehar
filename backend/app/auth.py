from datetime import datetime, timedelta
from typing import Optional, Dict
import random
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app import models

# In-memory store for OTPs: {mobile_number: {"otp": otp, "expires_at": datetime}}
otp_store: Dict[str, Dict] = {}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/token-login-url-unused", auto_error=False)

def generate_otp(mobile_number: str) -> str:
    """
    Generates a 6-digit OTP, stores it in memory, and prints it to the console.
    """
    otp = "".join([str(random.randint(0, 9)) for _ in range(6)])
    expiry = datetime.utcnow() + timedelta(minutes=5)
    otp_store[mobile_number] = {"otp": otp, "expires_at": expiry}
    
    # Print the OTP to console so the developer can see it
    print("\n" + "=" * 50)
    print(f" MOCK OTP FOR {mobile_number}: {otp} (valid for 5 mins) ")
    print("=" * 50 + "\n")
    
    return otp

def verify_otp_code(mobile_number: str, otp: str) -> bool:
    """
    Verifies an OTP for a mobile number. Allows the default mock code '123456'.
    """
    if otp == settings.MOCK_OTP_CODE:
        return True
        
    store = otp_store.get(mobile_number)
    if not store:
        return False
        
    if store["expires_at"] < datetime.utcnow():
        # Remove expired OTP
        otp_store.pop(mobile_number, None)
        return False
        
    if store["otp"] == otp:
        # OTP verified, delete it
        otp_store.pop(mobile_number, None)
        return True
        
    return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_authority_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_authority:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have administrative/authority permissions",
        )
    return current_user
