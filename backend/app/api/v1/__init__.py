from fastapi import APIRouter

from app.api.auth import router as auth_router   
from app.api.v1.students import router as students_router
from app.api.v1.teachers import router as teachers_router
from app.api.v1.parents import router as parents_router
from app.api.v1.counselors import router as counselors_router
from app.api.v1.principal import router as principal_router
from app.api.health import router as health_router
from app.api.v1.admin import router as admin_router  #

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(students_router)
api_router.include_router(teachers_router)
api_router.include_router(parents_router)
api_router.include_router(counselors_router)
api_router.include_router(principal_router)
api_router.include_router(admin_router, prefix="/admin", tags=["admin"]) 
api_router.include_router(health_router, tags=["default"])
