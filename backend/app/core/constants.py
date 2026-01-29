# app/core/constants.py

ROLES = {
    "STUDENT": "student",
    "COUNSELOR": "counselor",
    "TEACHER": "teacher",
    "PARENT": "parent",
    "PRINCIPAL": "principal",
}

ENTRYPOINTS = {
    "STUDENT": "student_portal",
    "COUNSELOR": "counselor_portal",
    "TEACHER": "teacher_portal",
    "PARENT": "parent_portal",
    "PRINCIPAL": "principal_portal",
}

HEADERS = {
    "AUTH": "authorization",
    "DEMO_TOKEN": "x-nefera-demo-token",
    "ENTRYPOINT": "x-nefera-entrypoint",
}
