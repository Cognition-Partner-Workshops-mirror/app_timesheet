# 🏥 CareAI - AI-Powered Digital Healthcare Platform

> A next-generation healthcare platform like Practo (India), powered by AI for intelligent symptom triage, doctor recommendations, and proactive health management.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    NGINX REVERSE PROXY                   │
│                     (Port 80/443)                        │
└──────────┬──────────────┬───────────────┬───────────────┘
           │              │               │
    ┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
    │   Flutter   │ │  FastAPI   │ │   React    │
    │  Mobile App │ │  Backend   │ │   Admin    │
    │ (Web Build) │ │ (Port 8000)│ │  (Port 3000│)
    └─────────────┘ └──────┬─────┘ └────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼────┐ ┌────▼─────┐ ┌───▼────┐
        │PostgreSQL │ │  MinIO   │ │ OpenAI │
        │ (Port 5432)│ │(S3 Store)│ │  GPT-4 │
        └──────────┘ └──────────┘ └────────┘
```

### Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Backend API** | Python 3.12 / FastAPI | REST API, business logic, AI services |
| **Mobile App** | Flutter 3.x / Dart | Patient & Doctor mobile app (Android + iOS) |
| **Admin Panel** | React 18 / TypeScript / Vite | Web dashboard for platform management |
| **Database** | PostgreSQL 16 | Primary relational database |
| **File Storage** | AWS S3 / MinIO | Health records, prescriptions, lab reports |
| **AI Engine** | OpenAI GPT-4 | Symptom triage, health insights, chatbot |
| **Reverse Proxy** | Nginx | Traffic routing, SSL termination |
| **Containerization** | Docker + Docker Compose | Deployment and orchestration |

---

## ✨ Features

### 👤 Patient App (Mobile)
- **Doctor Search & Booking** - Search by specialization, city, rating with real-time availability
- **AI Symptom Checker** - AI-powered triage with urgency scoring and specialist recommendations
- **Appointment Management** - Book, reschedule, cancel with status tracking
- **Health Records** - Upload lab reports, track vitals (BP, heart rate, BMI, blood sugar)
- **Digital Prescriptions** - View prescriptions with medication details
- **Health Dashboard** - Track health metrics over time
- **Video Consultation** - Real-time telemedicine support (WebRTC-ready)

### 👨‍⚕️ Doctor App (Mobile)
- **Appointment Dashboard** - View daily schedule with patient queue
- **Patient Management** - Access patient records and history
- **Consultation Tools** - Accept/complete appointments with notes
- **Prescription Builder** - Create digital prescriptions
- **Earnings Tracker** - Revenue and consultation statistics

### 🏢 Admin Portal (Web)
- **Platform Dashboard** - Real-time stats (users, appointments, revenue)
- **Doctor Onboarding** - Review and verify doctor profiles
- **User Management** - Activate/deactivate users, role management
- **Analytics & Revenue** - Period-based metrics with growth insights
- **AI Governance** - Monitor AI service usage and audit trail

### 🤖 AI Services
- **Symptom Triage** - Classify urgency (Emergency/Urgent/Routine/Self-Care)
- **Health Chatbot** - 24/7 AI health assistant
- **Personalized Insights** - Health recommendations based on records
- **Doctor Recommendations** - AI-based specialist matching

---

## 🚀 Quick Start

### Prerequisites
- **Docker & Docker Compose** (recommended for full stack)
- Or individual tools: Python 3.12+, Node.js 20+, Flutter 3.x, PostgreSQL 16

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/careai.git
cd careai

# Copy environment configuration
cp backend/.env.example backend/.env

# Start all services (PostgreSQL, MinIO, Backend, Admin, Nginx)
docker-compose up -d --build

# Check service status
docker-compose ps
```

**Access Points:**
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Admin Panel: http://localhost:3000
- MinIO Console: http://localhost:9001

### Option 2: Manual Setup

#### Backend (FastAPI + PostgreSQL)

```bash
cd backend

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up PostgreSQL database
# Option A: Use Docker for PostgreSQL only
docker run -d --name careai-postgres \
  -e POSTGRES_USER=careai \
  -e POSTGRES_PASSWORD=careai_password \
  -e POSTGRES_DB=careai_db \
  -p 5432:5432 \
  postgres:16-alpine

# Option B: Use SQLite for quick local testing
# Set USE_SQLITE=true in .env

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL and S3 settings

# Start the API server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Mobile App (Flutter)

```bash
cd mobile

# Install Flutter dependencies
flutter pub get

# Run on Android emulator/device
flutter run

# Run on iOS simulator (macOS only)
flutter run -d ios

# Build for web
flutter build web

# Build APK for Android
flutter build apk --release

# Build for iOS
flutter build ios --release
```

#### Admin Panel (React)

```bash
cd admin

# Install dependencies
npm install

# Start development server (with API proxy)
npm run dev

# Build for production
npm run build
```

---

## 🗄️ Database Schema

### PostgreSQL Tables

| Table | Description |
|-------|------------|
| `users` | All user accounts (patients, doctors, admins) with RBAC |
| `doctor_profiles` | Doctor professional info, fees, availability |
| `specializations` | Medical specializations (Cardiology, Dermatology, etc.) |
| `doctor_specializations` | Many-to-many: doctors ↔ specializations |
| `doctor_schedules` | Weekly availability slots for each doctor |
| `appointments` | Patient-doctor bookings with status tracking |
| `consultations` | Video/chat session metadata |
| `consultation_notes` | Doctor's notes from consultations |
| `prescriptions` | Digital prescriptions header |
| `prescription_items` | Individual medication entries |
| `health_records` | Patient medical records, vitals, uploaded files |
| `payments` | Payment transactions and invoice tracking |
| `notifications` | Push/email notification records |
| `ai_interactions` | Audit log for all AI service calls |

---

## 📦 AWS S3 / MinIO File Storage

Health records, lab reports, prescriptions, and profile images are stored in S3-compatible storage.

### Storage Folders
```
careai-uploads/
├── health-records/{user_id}/    # Lab reports, scans, vitals PDFs
├── prescriptions/{user_id}/     # Digital prescription documents
├── avatars/{user_id}/           # Profile images
└── consultations/{session_id}/  # Consultation attachments
```

### Configuration

**AWS S3:**
```env
S3_BUCKET_NAME=careai-uploads
S3_REGION=ap-south-1
S3_ACCESS_KEY_ID=your-aws-access-key
S3_SECRET_ACCESS_KEY=your-aws-secret-key
```

**MinIO (Self-Hosted / Open Source):**
```env
S3_ENDPOINT_URL=http://minio:9000
S3_BUCKET_NAME=careai-uploads
S3_ACCESS_KEY_ID=careai_minio_admin
S3_SECRET_ACCESS_KEY=careai_minio_secret
```

---

## 🔌 API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login and get JWT token |
| GET | `/api/v1/auth/me` | Get current user profile |
| POST | `/api/v1/auth/refresh` | Refresh access token |

### Doctors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/doctors/search` | Search doctors with filters |
| GET | `/api/v1/doctors/{id}` | Get doctor profile |
| GET | `/api/v1/doctors/specializations` | List specializations |
| POST | `/api/v1/doctors/profile` | Create/update doctor profile |

### Appointments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/appointments/` | Book appointment |
| GET | `/api/v1/appointments/my` | Get user's appointments |
| PUT | `/api/v1/appointments/{id}` | Update appointment status |
| DELETE | `/api/v1/appointments/{id}` | Cancel appointment |

### AI Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ai/symptom-check` | AI symptom triage |
| POST | `/api/v1/ai/chat` | Health chatbot |
| GET | `/api/v1/ai/health-insights` | Personalized health insights |

### Health Records
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/health-records/` | Create health record |
| POST | `/api/v1/health-records/upload` | Upload file to S3 |
| GET | `/api/v1/health-records/` | List patient records |
| POST | `/api/v1/health-records/vitals` | Quick vitals entry |
| GET | `/api/v1/health-records/file/{id}/download` | Get S3 presigned URL |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/dashboard` | Platform statistics |
| GET | `/api/v1/admin/users` | List all users |
| GET | `/api/v1/admin/doctors/pending` | Pending doctor verifications |
| POST | `/api/v1/admin/doctors/{id}/verify` | Verify a doctor |
| GET | `/api/v1/admin/analytics` | Platform analytics |

> Full interactive API docs available at: `http://localhost:8000/docs`

---

## ☁️ AWS EC2 Deployment

### EC2 Instance Requirements
- **Instance Type:** t3.medium (minimum) or t3.large (recommended)
- **OS:** Ubuntu 22.04 LTS
- **Storage:** 30GB+ EBS (gp3)
- **Security Group Ports:** 80, 443, 8000, 9001, 22

### Deploy

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Clone repository
git clone https://github.com/your-org/careai.git
cd careai

# Run the setup script
chmod +x deploy/ec2-setup.sh
./deploy/ec2-setup.sh
```

### AWS S3 Setup (Production)

```bash
# Create S3 bucket via AWS CLI
aws s3 mb s3://careai-uploads --region ap-south-1

# Set bucket policy for server-side encryption
aws s3api put-bucket-encryption --bucket careai-uploads \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

# Configure CORS for the bucket
aws s3api put-bucket-cors --bucket careai-uploads \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedOrigins": ["*"],
      "MaxAgeSeconds": 3600
    }]
  }'
```

### SSL/TLS (HTTPS)

```bash
# Install Certbot for free SSL certificates
sudo apt-get install certbot
sudo certbot --nginx -d yourdomain.com
```

---

## 🔐 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Patient | patient@careai.com | patient123 |
| Doctor | dr.sharma@careai.com | doctor123 |
| Admin | admin@careai.com | admin123 |

---

## 📁 Project Structure

```
careai/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── config.py          # Settings (PostgreSQL, S3, JWT)
│   │   ├── database.py        # SQLAlchemy async engine
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── routers/           # API route handlers
│   │   ├── services/          # Business logic (S3, etc.)
│   │   └── utils/             # Auth, seed data utilities
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile             # Backend container image
│   └── .env.example           # Environment template
├── mobile/                     # Flutter Mobile App
│   ├── lib/
│   │   ├── main.dart          # App entry point
│   │   ├── models/            # Data models
│   │   ├── services/          # API client, auth service
│   │   ├── providers/         # State management (Provider)
│   │   ├── screens/           # UI screens (auth, patient, doctor)
│   │   └── utils/             # Constants, helpers
│   └── pubspec.yaml           # Flutter dependencies
├── admin/                      # React Admin Panel
│   ├── src/
│   │   ├── App.tsx            # Main app with sidebar navigation
│   │   ├── pages/             # Dashboard, Users, Doctors, Analytics
│   │   └── services/          # Axios API client
│   ├── package.json           # Node.js dependencies
│   ├── Dockerfile             # Admin panel container image
│   └── vite.config.ts         # Vite bundler config
├── database/
│   └── init.sql               # PostgreSQL initialization
├── nginx/
│   └── nginx.conf             # Reverse proxy configuration
├── deploy/
│   └── ec2-setup.sh           # AWS EC2 deployment script
├── docker-compose.yml          # Full stack orchestration
└── README.md                   # This file
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | Python 3.12, FastAPI 0.115 | REST API, async request handling |
| ORM | SQLAlchemy 2.0 (async) | Database models and queries |
| Database | PostgreSQL 16 + asyncpg | Primary relational storage |
| File Storage | AWS S3 / MinIO | Object storage for medical files |
| Auth | JWT (python-jose) + bcrypt | Stateless authentication |
| AI | OpenAI GPT-4 | Symptom triage, chatbot, insights |
| Mobile | Flutter 3.x / Dart | Cross-platform mobile app |
| Admin | React 18 / TypeScript / Vite | Web-based admin dashboard |
| HTTP | Axios, http (Dart) | API client libraries |
| State | Provider (Flutter) | Mobile app state management |
| Proxy | Nginx | Reverse proxy, static serving |
| Containers | Docker, Docker Compose | Deployment and orchestration |
| Cloud | AWS EC2, S3 | Production hosting |

---

## 📝 License

This project is open-source. Built as a healthcare platform MVP demonstrating AI-powered digital health capabilities.
