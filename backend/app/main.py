import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError

from .auth import hash_password
from .config import settings
from .database import Base, SessionLocal, engine
from .models import User
from .routers import auth, bills, budgets, dashboard, income

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("finreminder")

app = FastAPI(title="Financial Reminder API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # web app is served same-origin; capacitor uses capacitor://localhost
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(bills.router)
app.include_router(income.router)
app.include_router(budgets.router)
app.include_router(dashboard.router)


@app.on_event("startup")
def startup():
    # wait for postgres, then create tables and seed the single admin user
    for attempt in range(30):
        try:
            Base.metadata.create_all(engine)
            break
        except OperationalError:
            log.info("waiting for database... (%d)", attempt + 1)
            time.sleep(2)
    else:
        raise RuntimeError("database not reachable")

    # lightweight migration: add columns introduced after the first deploy
    with engine.begin() as conn:
        try:
            conn.exec_driver_sql("ALTER TABLE bills ADD COLUMN total_amount NUMERIC(14,2)")
        except Exception:
            pass  # column already exists

    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == settings.admin_email).first():
            db.add(User(email=settings.admin_email,
                        password_hash=hash_password(settings.admin_password)))
            db.commit()
            log.info("created admin user %s", settings.admin_email)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}
