# TRIPPLANNERAI - Backend 🚀

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Gemini AI](https://img.shields.io/badge/Gemini%20AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

> **TRIPPLANNERAI Backend** is a high-performance, AI-integrated travel management engine. It handles complex itinerary generation, role-based authentication, background processing, and financial transactions.

---

## 📖 Table of Contents
- [Problem Statement](#-problem-statement)
- [Solution Overview](#-solution-overview)
- [Tech Stack](#-tech-stack)
- [Live Demo & Deployment](#-live-demo--deployment)
- [Project Structure](#-project-structure)
- [API Architecture & Endpoints](#-api-architecture--endpoints)
- [Key Features in Detail](#-key-features-in-detail)
- [AI Integration & Resilience](#-ai-integration--resilience)
- [Environment Variables](#-environment-variables)
- [Setup & Installation](#-setup--installation)
- [Demo Credentials](#-demo-credentials)

---

## ⚡ Problem Statement
Modern travel planning is fragmented. Travelers struggle with manual itinerary creation, while travel agents face administrative overhead in managing destinations, activities, and bookings. There is a lack of intelligent, automated systems that bridge the gap between user preferences and real-time travel inventory.

## 💡 Solution Overview
TRIPPLANNERAI provides a robust API that leverages **Google Gemini AI** to automate the "heavy lifting" of travel planning. It offers a scalable, secure, and resilient infrastructure that supports:
- **Intelligent Itinerary Generation:** Tailored schedules based on user preferences.
- **Admin Automation:** AI-assisted content creation for travel resources.
- **Secure Transactions:** Integrated Stripe payments and role-based access control.

## 🌐 Live Demo & Deployment
- **Frontend App:** [https://travel-planner-frontend-silk.vercel.app/](https://travel-planner-frontend-silk.vercel.app/)
- **Backend API:** [https://travel-planner-backend-1-57c6.onrender.com/](https://travel-planner-backend-1-57c6.onrender.com/)

## 🛠 Tech Stack
- **Runtime:** Node.js (v20+)
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (via Prisma ORM)
- **Authentication:** Better Auth (JWT-based session management)
- **Cache & Queues:** Redis (BullMQ for background jobs)
- **AI Engine:** Google Generative AI (Gemini 1.5/2.0)
- **Payments:** Stripe
- **Media Storage:** Cloudinary
- **Security:** Helmet, Express-Rate-Limit, CORS
- **Monitoring:** Sentry & Pino (Structured Logging)

---

## 📂 Project Structure
The backend follows a modular **Controller-Service-Repository** pattern for scalability and maintainability.

```text
src/
├── app/
│   ├── config/             # Environment & Global Config
│   ├── lib/                # Database (Prisma), Auth, Redis clients
│   ├── middleware/         # Auth, Error handling, Validation, Rate-limiters
│   ├── routes/             # Main API Router index
│   ├── utils/              # CatchAsync, Cloudinary, Gemini, Stripe helpers
│   └── module/             # FEATURE-BASED MODULES
│       ├── ai/             # Itinerary & Content Generation
│       ├── trip/           # Trip Planning & Management
│       ├── destination/    # Resource Discovery
│       ├── booking/        # Payment & Checkout logic
│       ├── user/           # Profile & Account management
│       └── ...             # (Accommodation, Activity, Analytics, etc.)
├── workers/                # BullMQ Background Workers (AI, Email, Analytics)
├── server.ts               # HTTP Server Entry Point
└── start-workers.ts        # Background Process Entry Point
```

---

## 🛣 API Architecture & Endpoints
All API endpoints are prefixed with `/api/v1`.

### 🔐 Authentication & Users
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Register a new account |
| `POST` | `/auth/login` | Secure login session |
| `GET` | `/user/me` | Fetch current user profile |

### 🤖 AI & Travel Logic
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/ai/generate-itinerary` | Generate a full AI trip plan |
| `GET` | `/ai/recommendations` | Get personalized stay/activity suggestions |
| `POST` | `/ai/magic-content` | (Admin) Auto-generate descriptions/tags |

### ✈️ Trip & Resource Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/trip/all` | List all user trips |
| `POST` | `/trip/create` | Manually create/save a trip |
| `GET` | `/destination` | Explore destinations with AI filtering |

### 💳 Bookings & Payments
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/booking/checkout` | Create Stripe Checkout session |
| `POST` | `/booking/webhook` | Handle Stripe payment events |

---

## ✨ Key Features in Detail

### 1. Multi-key AI Rotation
The **AIService** implements a sophisticated rotation logic. If an API key hits a quota limit (429), the system automatically switches to the next available key from the pool, ensuring uninterrupted service for heavy AI generation tasks.

### 2. Role-Based Access Control (RBAC)
Granular permissions are enforced via middleware:
- **Admin:** Full access to analytics, user management, and resource creation.
- **Travel Agent:** Management of assigned destinations and bookings.
- **User:** Personal trip planning, bookings, and profile management.

### 3. Background Processing
Long-running tasks like AI generation, email dispatch, and analytics aggregation are offloaded to **BullMQ** workers. This keeps the main API response times extremely fast and prevents timeout issues.

### 4. Real-time Notifications
Integrated with WebSockets to provide live updates when an AI-generated itinerary is ready or when a payment is successfully processed.

---

## 🤖 AI Integration & Resilience
The backend features a sophisticated **AIService** that:
1. **Context-Aware Prompts:** Dynamically constructs prompts for precise itinerary and content generation.
2. **Quota Management:** Automatically detects `429 (Too Many Requests)` errors and rotates to the next available Gemini API key.
3. **Structured Outputs:** Uses Zod-validated JSON responses from AI to ensure data integrity.
4. **Admin "Magic AI":** Provides endpoints to auto-generate descriptions and tags for destinations and accommodations.

---

## 🔑 Environment Variables
Create a `.env` file in the root directory:

```env
# Server
PORT=5000
NODE_ENV=development

# Database & Cache
DATABASE_URL="your-postgresql-url"
REDIS_URL="your-redis-url"

# Authentication
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:5000
CLIENT_URL=http://localhost:3000

# AI & Media
GEMINI_API_KEY=key1,key2,key3  # Supports rotation
CLOUDINARY_CLOUD_NAME=your-name
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🚀 Setup & Installation

1. **Clone the repository**
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   npm run db:seed  # Optional: Seed initial data
   ```
4. **Start Development Server**
   ```bash
   npm run dev
   ```

---

## 👥 Demo Credentials
| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | admin@tripplanner.com | password123 |
| **Travel Agent** | agent@tripplanner.com | password123 |
| **Regular User** | user@tripplanner.com | password123 |

---

© 2026 TRIPPLANNERAI. All rights reserved.
