"""
Database Seed Data - Populates the database with initial data including
specializations, demo doctors, and sample patients for development/testing.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta

from app.models.user import User, UserRole, Gender
from app.models.doctor import DoctorProfile, Specialization, DoctorSchedule
from app.utils.auth import hash_password


# Medical specializations available on the platform
SPECIALIZATIONS = [
    {"name": "General Medicine", "description": "Primary care and general health concerns", "icon": "stethoscope"},
    {"name": "Cardiology", "description": "Heart and cardiovascular system", "icon": "heart"},
    {"name": "Dermatology", "description": "Skin, hair, and nail conditions", "icon": "skin"},
    {"name": "Orthopedics", "description": "Bones, joints, and musculoskeletal system", "icon": "bone"},
    {"name": "Pediatrics", "description": "Children's health and development", "icon": "baby"},
    {"name": "Gynecology", "description": "Women's reproductive health", "icon": "female"},
    {"name": "Neurology", "description": "Brain and nervous system disorders", "icon": "brain"},
    {"name": "Psychiatry", "description": "Mental health and behavioral disorders", "icon": "mind"},
    {"name": "ENT", "description": "Ear, nose, and throat conditions", "icon": "ear"},
    {"name": "Ophthalmology", "description": "Eye care and vision problems", "icon": "eye"},
    {"name": "Dental", "description": "Oral health and dental care", "icon": "tooth"},
    {"name": "Pulmonology", "description": "Lung and respiratory conditions", "icon": "lungs"},
    {"name": "Gastroenterology", "description": "Digestive system disorders", "icon": "stomach"},
    {"name": "Endocrinology", "description": "Hormonal and metabolic disorders", "icon": "thyroid"},
    {"name": "Urology", "description": "Urinary system and male reproductive health", "icon": "kidney"},
]

# Demo doctors for development and testing
DEMO_DOCTORS = [
    {
        "email": "dr.sharma@careai.com",
        "full_name": "Dr. Rajesh Sharma",
        "phone": "+919876543210",
        "gender": Gender.MALE,
        "city": "Mumbai",
        "state": "Maharashtra",
        "qualification": "MBBS, MD (Internal Medicine)",
        "experience_years": 15,
        "bio": "Senior physician with 15+ years of experience in internal medicine. Specializes in diabetes management and preventive healthcare.",
        "hospital_name": "Apollo Hospital",
        "consultation_fee": 500.0,
        "rating": 4.8,
        "total_reviews": 342,
        "total_consultations": 1250,
        "specialization": "General Medicine",
    },
    {
        "email": "dr.priya@careai.com",
        "full_name": "Dr. Priya Patel",
        "phone": "+919876543211",
        "gender": Gender.FEMALE,
        "city": "Delhi",
        "state": "Delhi",
        "qualification": "MBBS, DM (Cardiology)",
        "experience_years": 12,
        "bio": "Expert cardiologist specializing in interventional cardiology and heart failure management.",
        "hospital_name": "Fortis Heart Institute",
        "consultation_fee": 800.0,
        "rating": 4.9,
        "total_reviews": 256,
        "total_consultations": 980,
        "specialization": "Cardiology",
    },
    {
        "email": "dr.arun@careai.com",
        "full_name": "Dr. Arun Kumar",
        "phone": "+919876543212",
        "gender": Gender.MALE,
        "city": "Bangalore",
        "state": "Karnataka",
        "qualification": "MBBS, MD (Dermatology)",
        "experience_years": 10,
        "bio": "Dermatologist with expertise in cosmetic dermatology, acne treatment, and skin allergy management.",
        "hospital_name": "Manipal Hospital",
        "consultation_fee": 600.0,
        "rating": 4.7,
        "total_reviews": 198,
        "total_consultations": 750,
        "specialization": "Dermatology",
    },
    {
        "email": "dr.meera@careai.com",
        "full_name": "Dr. Meera Reddy",
        "phone": "+919876543213",
        "gender": Gender.FEMALE,
        "city": "Hyderabad",
        "state": "Telangana",
        "qualification": "MBBS, MS (Orthopedics)",
        "experience_years": 8,
        "bio": "Orthopedic surgeon specializing in joint replacement and sports medicine.",
        "hospital_name": "KIMS Hospital",
        "consultation_fee": 700.0,
        "rating": 4.6,
        "total_reviews": 145,
        "total_consultations": 520,
        "specialization": "Orthopedics",
    },
    {
        "email": "dr.anita@careai.com",
        "full_name": "Dr. Anita Singh",
        "phone": "+919876543214",
        "gender": Gender.FEMALE,
        "city": "Chennai",
        "state": "Tamil Nadu",
        "qualification": "MBBS, MD (Pediatrics)",
        "experience_years": 14,
        "bio": "Pediatrician specializing in child development, vaccination, and neonatal care.",
        "hospital_name": "Rainbow Children's Hospital",
        "consultation_fee": 450.0,
        "rating": 4.9,
        "total_reviews": 410,
        "total_consultations": 2100,
        "specialization": "Pediatrics",
    },
    {
        "email": "dr.vikram@careai.com",
        "full_name": "Dr. Vikram Joshi",
        "phone": "+919876543215",
        "gender": Gender.MALE,
        "city": "Pune",
        "state": "Maharashtra",
        "qualification": "MBBS, DM (Neurology)",
        "experience_years": 18,
        "bio": "Neurologist with extensive experience in stroke management, epilepsy, and headache disorders.",
        "hospital_name": "Sahyadri Hospital",
        "consultation_fee": 900.0,
        "rating": 4.8,
        "total_reviews": 189,
        "total_consultations": 680,
        "specialization": "Neurology",
    },
]


async def seed_database(db: AsyncSession):
    """
    Seed the database with initial specializations and demo doctors.
    Only runs if no specializations exist (prevents duplicate seeding).
    """
    # Check if data already exists
    result = await db.execute(select(Specialization))
    if result.scalars().first():
        return  # Already seeded

    # Seed specializations
    spec_map = {}
    for spec_data in SPECIALIZATIONS:
        spec = Specialization(**spec_data)
        db.add(spec)
        await db.flush()
        spec_map[spec_data["name"]] = spec

    # Seed admin user
    admin = User(
        email="admin@careai.com",
        full_name="CareAI Admin",
        hashed_password=hash_password("admin123"),
        role=UserRole.ADMIN,
        is_active=True,
        is_verified=True,
    )
    db.add(admin)

    # Seed demo patient
    patient = User(
        email="patient@careai.com",
        full_name="Rahul Verma",
        phone="+919999888877",
        hashed_password=hash_password("patient123"),
        role=UserRole.PATIENT,
        gender=Gender.MALE,
        city="Mumbai",
        state="Maharashtra",
        is_active=True,
        is_verified=True,
    )
    db.add(patient)

    # Seed demo doctors
    for doc_data in DEMO_DOCTORS:
        user = User(
            email=doc_data["email"],
            full_name=doc_data["full_name"],
            phone=doc_data["phone"],
            hashed_password=hash_password("doctor123"),
            role=UserRole.DOCTOR,
            gender=doc_data["gender"],
            city=doc_data["city"],
            state=doc_data["state"],
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.flush()

        # Create doctor profile
        profile = DoctorProfile(
            user_id=user.id,
            qualification=doc_data["qualification"],
            experience_years=doc_data["experience_years"],
            bio=doc_data["bio"],
            hospital_name=doc_data["hospital_name"],
            consultation_fee=doc_data["consultation_fee"],
            rating=doc_data["rating"],
            total_reviews=doc_data["total_reviews"],
            total_consultations=doc_data["total_consultations"],
            is_verified=True,
            is_available=True,
        )
        db.add(profile)
        await db.flush()

        # Link specialization
        if doc_data["specialization"] in spec_map:
            profile.specializations.append(spec_map[doc_data["specialization"]])

        # Add weekly schedule (Mon-Fri, 9AM-5PM + Sat 9AM-1PM)
        for day in range(5):  # Monday to Friday
            schedule = DoctorSchedule(
                doctor_id=profile.id,
                day_of_week=day,
                start_time="09:00",
                end_time="17:00",
                slot_duration=30,
            )
            db.add(schedule)
        # Saturday half day
        sat_schedule = DoctorSchedule(
            doctor_id=profile.id,
            day_of_week=5,
            start_time="09:00",
            end_time="13:00",
            slot_duration=30,
        )
        db.add(sat_schedule)

    await db.commit()
