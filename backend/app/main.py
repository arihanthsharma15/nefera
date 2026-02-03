# app/main.py
from fastapi import FastAPI

from app.api.v1 import api_router 
from fastapi.middleware.cors import CORSMiddleware # 👈 yahi aggregate router use karenge

app = FastAPI(
    title="Wellness Platform API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sare routes yahi se aa jayenge
app.include_router(api_router)           # ya prefix="/api/v1" agar versioned URL chahiye

@app.get("/")
def root():
    return {"message": "Wellness Platform API running"}