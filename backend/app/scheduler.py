import logging
from datetime import datetime, date
import random
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler
from app.database import SessionLocal
from app import models

logger = logging.getLogger(__name__)

# List of sample commodities and market names for simulation
COMMODITIES = [
    {"name": "Potato (Aloo)", "min": 12, "max": 22, "modal": 17},
    {"name": "Tomato (Tamatar)", "min": 20, "max": 45, "modal": 32},
    {"name": "Onion (Pyaz)", "min": 15, "max": 30, "modal": 22},
    {"name": "Green Chilli (Hari Mirch)", "min": 40, "max": 70, "modal": 55},
    {"name": "Wheat (Gehun)", "min": 22, "max": 28, "modal": 25},
    {"name": "Rice (Chawal)", "min": 35, "max": 65, "modal": 50},
    {"name": "Garlic (Lahsun)", "min": 80, "max": 150, "modal": 120},
    {"name": "Ginger (Adrak)", "min": 60, "max": 100, "modal": 80},
    {"name": "Apple (Seb)", "min": 80, "max": 180, "modal": 130},
    {"name": "Banana (Kela)", "min": 25, "max": 45, "modal": 35},
]

MANDIS = [
    {"market_name": "Lucknow Mandi", "district": "Lucknow", "state": "Uttar Pradesh"},
    {"market_name": "Naveen Mandi Sthal", "district": "Lucknow", "state": "Uttar Pradesh"},
    {"market_name": "Jaipur Mandi", "district": "Jaipur", "state": "Rajasthan"},
    {"market_name": "Pune Mandi (Gultekdi)", "district": "Pune", "state": "Maharashtra"},
    {"market_name": "Kalyan Mandi", "district": "Thane", "state": "Maharashtra"},
]

def fetch_and_sync_rates():
    """
    Simulates fetching daily mandi price data from Agmarknet.
    Saves the prices to the database.
    """
    logger.info("Starting daily Agmarknet rates fetch...")
    db: Session = SessionLocal()
    try:
        today = date.today()
        
        # Check if we already fetched today
        existing = db.query(models.MandiPrice).filter(models.MandiPrice.price_date == today).first()
        if existing:
            logger.info("Rates for today already exist. Skipping.")
            return

        # Fetch yesterday's rates for fallback/caching if needed, but since we are simulating,
        # we generate new rates for today with minor fluctuations from previous rates if available
        count = 0
        for mandi in MANDIS:
            for comm in COMMODITIES:
                # Find if we have a previous price
                prev_price = db.query(models.MandiPrice).filter(
                    models.MandiPrice.market_name == mandi["market_name"],
                    models.MandiPrice.commodity_name == comm["name"]
                ).order_by(models.MandiPrice.price_date.desc()).first()

                if prev_price:
                    # Fluctuate price slightly
                    fluctuation = random.uniform(-0.08, 0.08)  # +/- 8%
                    modal = round(prev_price.modal_price * (1 + fluctuation), 1)
                    min_p = round(modal * 0.8, 1)
                    max_p = round(modal * 1.2, 1)
                else:
                    # Generate base rates
                    fluctuation = random.uniform(-0.1, 0.1)
                    modal = round(comm["modal"] * (1 + fluctuation), 1)
                    min_p = round(modal * 0.8, 1)
                    max_p = round(modal * 1.2, 1)

                mandi_price = models.MandiPrice(
                    commodity_name=comm["name"],
                    market_name=mandi["market_name"],
                    district=mandi["district"],
                    state=mandi["state"],
                    min_price=min_p,
                    max_price=max_p,
                    modal_price=modal,
                    price_date=today,
                    fetched_at=datetime.utcnow()
                )
                db.add(mandi_price)
                count += 1
        
        db.commit()
        logger.info(f"Successfully synced {count} mandi commodity rates for {today}.")
    except Exception as e:
        logger.error(f"Error fetching mandi rates: {e}")
        db.rollback()
    finally:
        db.close()

def start_scheduler():
    scheduler = BackgroundScheduler()
    # Run rates sync daily at 6 AM
    scheduler.add_job(fetch_and_sync_rates, 'cron', hour=6, minute=0)
    scheduler.start()
    logger.info("MeraShehar Background Scheduler started successfully.")
    
    # Run once on startup asynchronously to populate initial rates
    fetch_and_sync_rates()
