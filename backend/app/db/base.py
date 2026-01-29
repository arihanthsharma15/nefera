# backend/app/db/base.py

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Format: postgresql://USER:PASSWORD@HOST/DB_NAME
SQLALCHEMY_DATABASE_URL = "postgresql://nefera_user:neferapass123@localhost/nefera_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()