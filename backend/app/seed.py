import os
import logging
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app import models
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_db():
    logger.info("Initializing database schema...")
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        # Check if already seeded
        if db.query(models.User).first() is not None:
            logger.info("Database already has data. Skipping seeding.")
            return
            
        logger.info("Seeding data...")
        
        # 1. Create Users
        citizen1 = models.User(
            id="u-citizen-1",
            full_name="Rajesh Kumar",
            mobile_number="9876543210",
            address="12, Hazratganj, Lucknow",
            city="Lucknow",
            district="Lucknow",
            latitude=26.8467,
            longitude=80.9462,
            is_authority=False
        )
        citizen2 = models.User(
            id="u-citizen-2",
            full_name="Priya Sharma",
            mobile_number="9876543211",
            address="Sec 4, Aliganj, Lucknow",
            city="Lucknow",
            district="Lucknow",
            latitude=26.8894,
            longitude=80.9385,
            is_authority=False
        )
        authority1 = models.User(
            id="u-authority-1",
            full_name="Admin Nagar Palika",
            mobile_number="9999999999", # Ends with 9999 -> Auto authority
            address="Municipal Office, Hazratganj",
            city="Lucknow",
            district="Lucknow",
            latitude=26.8456,
            longitude=80.9443,
            is_authority=True
        )
        db.add_all([citizen1, citizen2, authority1])
        db.commit()
        
        # 2. Create Authority Routing Map
        routings = [
            models.AuthorityRoutingMap(
                category="Waste Collection",
                city="Lucknow",
                authority_name="Lucknow Nagar Nigam (SWM Dept)",
                authority_contact="swm@lucknownagarvigam.in"
            ),
            models.AuthorityRoutingMap(
                category="Streetlight Fault",
                city="Lucknow",
                authority_name="LNN Streetlight Division",
                authority_contact="streetlights@lucknownagarvigam.in"
            ),
            models.AuthorityRoutingMap(
                category="Electricity",
                city="Lucknow",
                authority_name="MVVNL (Madhyanchal Vidyut Vitran)",
                authority_contact="1912@mvvnl.in"
            ),
            models.AuthorityRoutingMap(
                category="Water Supply",
                city="Lucknow",
                authority_name="Lucknow Jal Sansthan",
                authority_contact="jalsansthan@lucknow.nic.in"
            ),
            models.AuthorityRoutingMap(
                category="Road Damage",
                city="Lucknow",
                authority_name="PWD Lucknow Division",
                authority_contact="pwd-lucknow@up.nic.in"
            ),
        ]
        db.add_all(routings)
        db.commit()
        
        # 3. Create Posts
        now = datetime.utcnow()
        
        # News
        news1 = models.Post(
            id="p-news-1",
            user_id="u-citizen-1",
            type="news",
            text="Hazratganj crossing heavily congested due to waterlogging from sudden evening rains. Avoid this route if traveling towards Charbagh.",
            media_url=None,
            latitude=26.8467,
            longitude=80.9462,
            city="Lucknow",
            district="Lucknow",
            status="resolved",
            likes_count=12,
            upvotes_count=8,
            created_at=now - timedelta(hours=3)
        )
        news2 = models.Post(
            id="p-news-2",
            user_id="u-citizen-2",
            type="news",
            text="Annual Lucknow Mahotsav dates announced! Set to start from November 25th at Kanshiram Smriti Upvan. Cultural events, local crafts, and delicious Awadhi food stalls await.",
            media_url=None,
            latitude=26.8015,
            longitude=80.9022,
            city="Lucknow",
            district="Lucknow",
            status="resolved",
            likes_count=45,
            upvotes_count=20,
            created_at=now - timedelta(hours=18)
        )
        
        # Complaints
        complaint1 = models.Post(
            id="p-comp-1",
            user_id="u-citizen-1",
            type="complaint",
            category="Streetlight Fault",
            text="All streetlights on Shahnajaf Road have been non-functional for three nights. It gets pitch dark, making it unsafe for pedestrians and two-wheelers.",
            media_url="/api/v1/feed/media/sample_streetlight.jpg", # Placeholder/mock file
            latitude=26.8501,
            longitude=80.9490,
            city="Lucknow",
            district="Lucknow",
            status="pending",
            likes_count=4,
            upvotes_count=19,
            created_at=now - timedelta(days=2)
        )
        
        complaint2 = models.Post(
            id="p-comp-2",
            user_id="u-citizen-2",
            type="complaint",
            category="Waste Collection",
            text="Huge pile of garbage accumulated near Sector 4 community park. Municipal dump truck hasn't visited in over a week. Foul smell is spreading.",
            media_url="/api/v1/feed/media/sample_garbage.jpg",
            latitude=26.8902,
            longitude=80.9392,
            city="Lucknow",
            district="Lucknow",
            status="in_progress",
            likes_count=8,
            upvotes_count=32,
            created_at=now - timedelta(days=5)
        )

        complaint3 = models.Post(
            id="p-comp-3",
            user_id="u-citizen-1",
            type="complaint",
            category="Water Supply",
            text="Dirty brown water flowing from residential taps in LDA colony since yesterday morning. Extremely unhygienic.",
            media_url="/api/v1/feed/media/sample_water.jpg",
            latitude=26.7904,
            longitude=80.9015,
            city="Lucknow",
            district="Lucknow",
            status="forwarded",
            likes_count=3,
            upvotes_count=15,
            created_at=now - timedelta(days=1)
        )

        db.add_all([news1, news2, complaint1, complaint2, complaint3])
        db.commit()

        # 4. Likes & Upvotes
        db.add_all([
            models.Like(post_id="p-news-1", user_id="u-citizen-2"),
            models.Upvote(post_id="p-news-1", user_id="u-citizen-2"),
            models.Upvote(post_id="p-comp-1", user_id="u-citizen-2"),
            models.Upvote(post_id="p-comp-2", user_id="u-citizen-1"),
        ])
        db.commit()

        # 5. Comments
        db.add_all([
            models.Comment(
                post_id="p-news-1",
                user_id="u-citizen-2",
                text="Passed HAZRATGanj an hour ago, traffic is crawling. Avoid!"
            ),
            models.Comment(
                post_id="p-comp-2",
                user_id="u-authority-1",
                text="Forwarded to Lucknow Nagar Nigam zonal sanitation officer. Truck will clear this tomorrow morning."
            )
        ])
        db.commit()

        # 6. Jobs
        jobs = [
            models.Job(
                title="Delivery Executive",
                description="Urgent opening for food and grocery delivery boys. Must have a valid two-wheeler license and smartphone. Fuel allowance provided.",
                category="Delivery",
                contact_name="Ramesh Cargo Logistix",
                contact_number="9876500111",
                location_area="Charbagh",
                city="Lucknow",
                district="Lucknow",
                salary_range="₹15,000 - ₹20,000 / month",
                expires_at=datetime.utcnow() + timedelta(days=25)
            ),
            models.Job(
                title="Retail Store Assistant",
                description="Required assistant for apparel showroom. Duties include managing stock, helping customers, and billing. Good communication skills in Hindi required.",
                category="Shop Staff",
                contact_name="Aman (Manager)",
                contact_number="9876500222",
                location_area="Hazratganj",
                city="Lucknow",
                district="Lucknow",
                salary_range="₹10,000 - ₹12,000 / month",
                expires_at=datetime.utcnow() + timedelta(days=15)
            ),
            models.Job(
                title="Office Helper & Peon",
                description="Looking for an office assistant for cleaning, tea service, and filing work. High school pass can apply.",
                category="Office Staff",
                contact_name="Pankaj Sharma",
                contact_number="9876500333",
                location_area="Kapoorthala",
                city="Lucknow",
                district="Lucknow",
                salary_range="₹8,000 - ₹9,500 / month",
                expires_at=datetime.utcnow() + timedelta(days=20)
            )
        ]
        db.add_all(jobs)
        db.commit()

        # 7. Mandi Prices
        # Seed price for yesterday and today
        yesterday = date.today() - timedelta(days=1)
        today = date.today()
        
        mandi_data = [
            # Yesterday
            models.MandiPrice(
                commodity_name="Potato (Aloo)", market_name="Lucknow Mandi",
                district="Lucknow", state="Uttar Pradesh",
                min_price=12, max_price=18, modal_price=15, price_date=yesterday
            ),
            models.MandiPrice(
                commodity_name="Tomato (Tamatar)", market_name="Lucknow Mandi",
                district="Lucknow", state="Uttar Pradesh",
                min_price=25, max_price=40, modal_price=30, price_date=yesterday
            ),
            models.MandiPrice(
                commodity_name="Onion (Pyaz)", market_name="Lucknow Mandi",
                district="Lucknow", state="Uttar Pradesh",
                min_price=18, max_price=25, modal_price=22, price_date=yesterday
            ),
            # Today (minor price fluctuations)
            models.MandiPrice(
                commodity_name="Potato (Aloo)", market_name="Lucknow Mandi",
                district="Lucknow", state="Uttar Pradesh",
                min_price=13, max_price=19, modal_price=16, price_date=today
            ),
            models.MandiPrice(
                commodity_name="Tomato (Tamatar)", market_name="Lucknow Mandi",
                district="Lucknow", state="Uttar Pradesh",
                min_price=30, max_price=48, modal_price=38, price_date=today
            ),
            models.MandiPrice(
                commodity_name="Onion (Pyaz)", market_name="Lucknow Mandi",
                district="Lucknow", state="Uttar Pradesh",
                min_price=18, max_price=26, modal_price=23, price_date=today
            )
        ]
        db.add_all(mandi_data)
        db.commit()

        # Create dummy physical files for seeded complaints
        import shutil
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        # Create tiny blank files for placeholders
        for filename in ["sample_streetlight.jpg", "sample_garbage.jpg", "sample_water.jpg"]:
            with open(os.path.join(settings.UPLOAD_DIR, filename), "wb") as f:
                f.write(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82")

        logger.info("Successfully seeded database.")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    seed_db()

