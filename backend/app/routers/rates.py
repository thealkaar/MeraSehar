from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/rates", tags=["mandi-rates"])

@router.get("", response_model=list[schemas.MandiPriceResponse])
def get_rates(
    commodity: Optional[str] = None,
    mandi: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Filter by user's district (Agmarknet data is structured by district)
    # We do a case-insensitive match
    query = db.query(models.MandiPrice).filter(
        models.MandiPrice.district.ilike(f"%{current_user.district}%")
    )
    
    # Check if there are results for this district
    # If not, fallback to their state
    if query.count() == 0:
        # Fallback to state-wide rates
        query = db.query(models.MandiPrice) # We can seed state-wide default rates
        
    if commodity:
        query = query.filter(models.MandiPrice.commodity_name.ilike(f"%{commodity}%"))
        
    if mandi:
        query = query.filter(models.MandiPrice.market_name.ilike(f"%{mandi}%"))
        
    # Sort by date (latest first), then commodity name
    return query.order_by(desc(models.MandiPrice.price_date), models.MandiPrice.commodity_name).all()
