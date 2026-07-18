from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/send-otp", status_code=status.HTTP_200_OK)
def send_otp(payload: schemas.OTPSend):
    # Generates a mock OTP, logs it to terminal
    otp = auth.generate_otp(payload.mobile_number)
    return {"message": "OTP sent successfully (check console/logs for code)"}

@router.post("/verify-otp", response_model=schemas.OTPVerifyResponse)
def verify_otp(payload: schemas.OTPVerify, db: Session = Depends(get_db)):
    if not auth.verify_otp_code(payload.mobile_number, payload.otp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
        
    # Check if user exists
    user = db.query(models.User).filter(models.User.mobile_number == payload.mobile_number).first()
    
    if user:
        token = auth.create_access_token(data={"sub": user.id})
        return schemas.OTPVerifyResponse(
            is_registered=True,
            token=token,
            user=schemas.UserResponse.from_orm(user)
        )
    else:
        return schemas.OTPVerifyResponse(
            is_registered=False,
            token=None,
            user=None
        )

@router.post("/register", response_model=schemas.OTPVerifyResponse)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.mobile_number == payload.mobile_number).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number already registered"
        )
        
    new_user = models.User(
        full_name=payload.full_name,
        mobile_number=payload.mobile_number,
        address=payload.address,
        city=payload.city.strip(),
        district=payload.district.strip(),
        latitude=payload.latitude,
        longitude=payload.longitude,
        # Default first user or specific mobile to authority for demo if desired
        is_authority=payload.mobile_number.endswith("9999") or "authority" in payload.full_name.lower()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = auth.create_access_token(data={"sub": new_user.id})
    return schemas.OTPVerifyResponse(
        is_registered=True,
        token=token,
        user=schemas.UserResponse.from_orm(new_user)
    )

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@router.patch("/me", response_model=schemas.UserResponse)
def update_me(payload: schemas.UserUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    for field, value in payload.dict(exclude_unset=True).items():
        if field in ["city", "district"] and value:
            setattr(current_user, field, value.strip())
        else:
            setattr(current_user, field, value)
            
    db.commit()
    db.refresh(current_user)
    return current_user
