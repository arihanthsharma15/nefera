# backend/create_tables.py
import sys
import os 

sys.path.append(os.getcwd())

from app.db.base import engine, Base

from app import models 

print("Creating tables in nefera_db...")
try:
    Base.metadata.create_all(bind=engine)
    print("✅ Success!")
except Exception as e:
    print(f"❌ Error: {e}")