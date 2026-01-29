# app/main.py
from fastapi import FastAPI

from app.api.v1 import api_router  # 👈 yahi aggregate router use karenge

app = FastAPI(
    title="Wellness Platform API",
    version="0.1.0",
)

# Sare routes yahi se aa jayenge
app.include_router(api_router)           # ya prefix="/api/v1" agar versioned URL chahiye

@app.get("/")
def root():
    return {"message": "Wellness Platform API running"}