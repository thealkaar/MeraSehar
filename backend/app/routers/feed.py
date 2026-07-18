import os
import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import desc, and_, or_
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth
from app.config import settings

router = APIRouter(prefix="/feed", tags=["feed"])

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@router.get("", response_model=schemas.FeedResponse)
def get_feed(
    type: str,  # 'news' or 'complaint'
    cursor: Optional[str] = None,  # Cursor parameter
    limit: int = 10,
    sort: str = "recent",  # 'recent' or 'trending'
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Base query scoped to the user's city/district
    query = db.query(models.Post).filter(
        models.Post.type == type,
        models.Post.city == current_user.city
    )

    if category:
        query = query.filter(models.Post.category == category)
    if status_filter:
        query = query.filter(models.Post.status == status_filter)

    # Sort & Paginate
    if sort == "trending":
        # Trending: Upvote count last 24h
        time_threshold = datetime.utcnow() - timedelta(hours=24)
        query = query.filter(models.Post.created_at >= time_threshold)
        
        # Cursor formatting for trending: upvotes_count:post_id
        if cursor:
            try:
                cursor_upvotes, cursor_id = cursor.split(":")
                cursor_upvotes = int(cursor_upvotes)
                query = query.filter(
                    or_(
                        models.Post.upvotes_count < cursor_upvotes,
                        and_(
                            models.Post.upvotes_count == cursor_upvotes,
                            models.Post.id < cursor_id
                        )
                    )
                )
            except ValueError:
                pass  # Ignore invalid cursor
                
        query = query.order_by(desc(models.Post.upvotes_count), desc(models.Post.id))
        
    else:  # 'recent'
        # Cursor formatting for recent: ISO timestamp
        if cursor:
            try:
                cursor_time = datetime.fromisoformat(cursor)
                query = query.filter(models.Post.created_at < cursor_time)
            except ValueError:
                pass  # Ignore invalid cursor
                
        query = query.order_by(desc(models.Post.created_at))

    # Fetch limit + 1 items to see if there is a next page
    posts = query.limit(limit + 1).all()
    
    has_more = len(posts) > limit
    if has_more:
        next_posts = posts[:limit]
        last_post = next_posts[-1]
        if sort == "trending":
            next_cursor = f"{last_post.upvotes_count}:{last_post.id}"
        else:
            next_cursor = last_post.created_at.isoformat()
    else:
        next_posts = posts
        next_cursor = None

    # Populate likes/upvotes flag for current user
    results = []
    for post in next_posts:
        is_liked = db.query(models.Like).filter(
            models.Like.post_id == post.id,
            models.Like.user_id == current_user.id
        ).first() is not None
        
        is_upvoted = db.query(models.Upvote).filter(
            models.Upvote.post_id == post.id,
            models.Upvote.user_id == current_user.id
        ).first() is not None
        
        # Cast to response model
        post_response = schemas.PostResponse.from_orm(post)
        post_response.is_liked = is_liked
        post_response.is_upvoted = is_upvoted
        results.append(post_response)

    return schemas.FeedResponse(posts=results, next_cursor=next_cursor)


@router.post("", response_model=schemas.PostResponse)
async def create_post(
    type: str = Form(...),  # 'news' or 'complaint'
    text: str = Form(...),
    category: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Validation
    if type not in ["news", "complaint"]:
        raise HTTPException(status_code=400, detail="Invalid post type. Must be 'news' or 'complaint'")
        
    if type == "complaint":
        if not category:
            raise HTTPException(status_code=400, detail="Category is required for complaints")
        if not file:
            raise HTTPException(status_code=400, detail="Photo attachment is mandatory for complaints")
            
    media_url = None
    if file:
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            
        media_url = f"{settings.API_V1_STR}/feed/media/{unique_filename}"

    new_post = models.Post(
        user_id=current_user.id,
        type=type,
        category=category,
        text=text,
        media_url=media_url,
        latitude=latitude or current_user.latitude,
        longitude=longitude or current_user.longitude,
        city=current_user.city,
        district=current_user.district,
        status="pending" if type == "complaint" else "resolved"  # news is resolved by default
    )
    
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    
    # Cast to schema
    resp = schemas.PostResponse.from_orm(new_post)
    resp.is_liked = False
    resp.is_upvoted = False
    return resp


@router.get("/media/{filename}", response_class=FileResponse)
def get_media_file(filename: str):
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Media not found")
    return FileResponse(file_path)


# ==========================================
# INTERACTIONS (Like, Upvote, Comment)
# ==========================================

@router.post("/posts/{post_id}/like")
def toggle_like(
    post_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    like = db.query(models.Like).filter(
        models.Like.post_id == post_id,
        models.Like.user_id == current_user.id
    ).first()
    
    if like:
        db.delete(like)
        post.likes_count = max(0, post.likes_count - 1)
        liked = False
    else:
        new_like = models.Like(post_id=post_id, user_id=current_user.id)
        db.add(new_like)
        post.likes_count += 1
        liked = True
        
    db.commit()
    return {"liked": liked, "likes_count": post.likes_count}


@router.post("/posts/{post_id}/upvote")
def toggle_upvote(
    post_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    upvote = db.query(models.Upvote).filter(
        models.Upvote.post_id == post_id,
        models.Upvote.user_id == current_user.id
    ).first()
    
    if upvote:
        db.delete(upvote)
        post.upvotes_count = max(0, post.upvotes_count - 1)
        upvoted = False
    else:
        new_upvote = models.Upvote(post_id=post_id, user_id=current_user.id)
        db.add(new_upvote)
        post.upvotes_count += 1
        upvoted = True
        
    db.commit()
    return {"upvoted": upvoted, "upvotes_count": post.upvotes_count}


@router.get("/posts/{post_id}/comments", response_model=list[schemas.CommentResponse])
def get_comments(
    post_id: str,
    db: Session = Depends(get_db)
):
    comments = db.query(models.Comment).filter(
        models.Comment.post_id == post_id
    ).order_by(models.Comment.created_at.asc()).all()
    return comments


@router.post("/posts/{post_id}/comments", response_model=schemas.CommentResponse)
def create_comment(
    post_id: str,
    payload: schemas.CommentCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    comment = models.Comment(
        post_id=post_id,
        user_id=current_user.id,
        text=payload.text
    )
    post.comments_count += 1
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


# ==========================================
# AUTHORITY COMPLAINT OPERATIONS
# ==========================================

class StatusUpdatePayload(schemas.BaseModel):
    status: str  # 'pending', 'forwarded', 'in_progress', 'resolved'

@router.patch("/complaints/{post_id}/status", response_model=schemas.PostResponse)
def update_complaint_status(
    post_id: str,
    payload: StatusUpdatePayload,
    current_user: models.User = Depends(auth.get_current_authority_user),
    db: Session = Depends(get_db)
):
    post = db.query(models.Post).filter(
        models.Post.id == post_id,
        models.Post.type == "complaint"
    ).first()
    
    if not post:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    valid_statuses = ["pending", "forwarded", "in_progress", "resolved"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")
        
    post.status = payload.status
    db.commit()
    db.refresh(post)
    
    # Populate flags for response
    is_liked = db.query(models.Like).filter(
        models.Like.post_id == post.id,
        models.Like.user_id == current_user.id
    ).first() is not None
    
    is_upvoted = db.query(models.Upvote).filter(
        models.Upvote.post_id == post.id,
        models.Upvote.user_id == current_user.id
    ).first() is not None
    
    resp = schemas.PostResponse.from_orm(post)
    resp.is_liked = is_liked
    resp.is_upvoted = is_upvoted
    return resp


@router.get("/complaints/routing", response_model=list[schemas.AuthorityRoutingMapResponse])
def get_routing_map(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    routing_maps = db.query(models.AuthorityRoutingMap).filter(
        models.AuthorityRoutingMap.city == current_user.city
    ).all()
    return routing_maps
