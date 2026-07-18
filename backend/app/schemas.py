from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date

# ==========================================
# AUTH & USER SCHEMAS
# ==========================================

class OTPSend(BaseModel):
    mobile_number: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")  # E.164 format

class OTPVerify(BaseModel):
    mobile_number: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")
    otp: str = Field(..., min_length=6, max_length=6)

class Token(BaseModel):
    access_token: str
    token_type: str

class OTPVerifyResponse(BaseModel):
    is_registered: bool
    token: Optional[str] = None
    user: Optional["UserResponse"] = None

class UserBase(BaseModel):
    full_name: str
    mobile_number: str
    address: Optional[str] = None
    city: str
    district: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class UserResponse(UserBase):
    id: str
    is_authority: bool
    created_at: datetime

    class Config:
        from_attributes = True

# To avoid forward reference issues
OTPVerifyResponse.model_rebuild()


# ==========================================
# COMMENT SCHEMAS
# ==========================================

class CommentBase(BaseModel):
    text: str

class CommentCreate(CommentBase):
    pass

class CommentResponse(CommentBase):
    id: str
    post_id: str
    user_id: str
    created_at: datetime
    user: UserResponse

    class Config:
        from_attributes = True


# ==========================================
# FEED SCHEMAS (News & Complaints)
# ==========================================

class PostBase(BaseModel):
    type: str  # 'news' or 'complaint'
    category: Optional[str] = None
    text: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class PostCreate(PostBase):
    city: str
    district: str

class PostResponse(PostBase):
    id: str
    user_id: str
    media_url: Optional[str] = None
    city: str
    district: str
    status: str
    upvotes_count: int
    likes_count: int
    comments_count: int
    created_at: datetime
    user: UserResponse
    is_liked: Optional[bool] = False
    is_upvoted: Optional[bool] = False

    class Config:
        from_attributes = True

class FeedResponse(BaseModel):
    posts: List[PostResponse]
    next_cursor: Optional[str] = None


# ==========================================
# JOB SCHEMAS
# ==========================================

class JobBase(BaseModel):
    title: str
    description: str
    category: str
    contact_name: str
    contact_number: str
    location_area: str
    salary_range: Optional[str] = None

class JobCreate(JobBase):
    city: str
    district: str

class JobResponse(JobBase):
    id: str
    posted_by_user_id: str
    city: str
    district: str
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==========================================
# RATES (Mandi) SCHEMAS
# ==========================================

class MandiPriceResponse(BaseModel):
    id: str
    commodity_name: str
    market_name: str
    district: str
    state: str
    min_price: float
    max_price: float
    modal_price: float
    price_date: date
    fetched_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# ROUTING MAP SCHEMAS
# ==========================================

class AuthorityRoutingMapResponse(BaseModel):
    id: str
    category: str
    city: str
    authority_name: str
    authority_contact: Optional[str] = None

    class Config:
        from_attributes = True
