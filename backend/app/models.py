import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Integer, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    full_name = Column(String(100), nullable=False)
    mobile_number = Column(String(15), unique=True, index=True, nullable=False)
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_authority = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    posts = relationship("Post", back_populates="user", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    upvotes = relationship("Upvote", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="poster", cascade="all, delete-orphan")


class Post(Base):
    __tablename__ = "posts"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(20), nullable=False)  # 'news' or 'complaint'
    category = Column(String(50), nullable=True)  # only for complaints
    text = Column(String(1000), nullable=False)
    media_url = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    city = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    status = Column(String(20), default="pending")  # 'pending', 'forwarded', 'in_progress', 'resolved'
    upvotes_count = Column(Integer, default=0)
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="posts")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")
    upvotes = relationship("Upvote", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")


class Upvote(Base):
    __tablename__ = "upvotes"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    post_id = Column(String(36), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="unique_post_user_upvote"),
    )

    # Relationships
    post = relationship("Post", back_populates="upvotes")
    user = relationship("User", back_populates="upvotes")


class Like(Base):
    __tablename__ = "likes"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    post_id = Column(String(36), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="unique_post_user_like"),
    )

    # Relationships
    post = relationship("Post", back_populates="likes")
    user = relationship("User", back_populates="likes")


class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    post_id = Column(String(36), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    post = relationship("Post", back_populates="comments")
    user = relationship("User", back_populates="comments")


class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    posted_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(String(1000), nullable=False)
    category = Column(String(50), nullable=False)
    contact_name = Column(String(100), nullable=False)
    contact_number = Column(String(15), nullable=False)
    location_area = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    salary_range = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    # Relationships
    poster = relationship("User", back_populates="jobs")


class MandiPrice(Base):
    __tablename__ = "mandi_prices"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    commodity_name = Column(String(100), nullable=False)
    market_name = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    min_price = Column(Float, nullable=False)
    max_price = Column(Float, nullable=False)
    modal_price = Column(Float, nullable=False)
    price_date = Column(Date, nullable=False)
    fetched_at = Column(DateTime, default=datetime.utcnow)


class AuthorityRoutingMap(Base):
    __tablename__ = "authority_routing_map"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    category = Column(String(50), nullable=False)
    city = Column(String(100), nullable=False)
    authority_name = Column(String(100), nullable=False)
    authority_contact = Column(String(100), nullable=True)
