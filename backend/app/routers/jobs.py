from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, or_, desc
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.get("", response_model=list[schemas.JobResponse])
def list_jobs(
    search: Optional[str] = None,
    category: Optional[str] = None,
    location: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Filter by user's city
    query = db.query(models.Job).filter(
        models.Job.city == current_user.city,
        models.Job.is_active == True,
        or_(models.Job.expires_at == None, models.Job.expires_at > datetime.utcnow())
    )
    
    if category:
        query = query.filter(models.Job.category == category)
        
    if location:
        query = query.filter(models.Job.location_area.ilike(f"%{location}%"))
        
    if search:
        query = query.filter(
            or_(
                models.Job.title.ilike(f"%{search}%"),
                models.Job.description.ilike(f"%{search}%")
            )
        )
        
    # Newest first
    return query.order_by(desc(models.Job.created_at)).all()


@router.post("", response_model=schemas.JobResponse)
def create_job(
    payload: schemas.JobBase,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Auto expire in 30 days
    expires_at = datetime.utcnow() + timedelta(days=30)
    
    new_job = models.Job(
        posted_by_user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        contact_name=payload.contact_name,
        contact_number=payload.contact_number,
        location_area=payload.location_area,
        city=current_user.city,
        district=current_user.district,
        salary_range=payload.salary_range,
        is_active=True,
        expires_at=expires_at
    )
    
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job


@router.patch("/{job_id}/deactivate", response_model=schemas.JobResponse)
def deactivate_job(
    job_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    # Only poster or authority can deactivate
    if job.posted_by_user_id != current_user.id and not current_user.is_authority:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to deactivate this job listing"
        )
        
    job.is_active = False
    db.commit()
    db.refresh(job)
    return job
