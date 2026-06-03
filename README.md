# Digital Library

A beautiful, mobile-friendly digital library application for storing and organizing PDFs, images, books, and documents.

## Features

- **File Management** – Upload, download, preview, and delete files (PDFs, images, eBooks, documents)
- **Collections** – Organize files into color-coded collections
- **Search & Sort** – Find files by name; sort by date, name, size, or type
- **Favorites** – Mark files as favorites for quick access
- **Tags** – Add tags to files for flexible categorization
- **Mobile-First** – Responsive design with bottom navigation on mobile, sidebar on desktop
- **Beautiful UI** – Modern Material UI interface with smooth animations

## Tech Stack

| Layer     | Technology                     |
|-----------|--------------------------------|
| Frontend  | React 19, Vite, Material UI, TanStack Query |
| Backend   | Node.js, Express.js            |
| Database  | SQLite (file-based persistence)|
| Upload    | Multer (disk storage)          |

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm

### Install Dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### Run Development Servers

```bash
# Start backend (port 3001)
cd backend && npm run dev

# Start frontend (port 5173)
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to use the app.

### API Endpoints

| Method | Endpoint                    | Description                  |
|--------|-----------------------------|------------------------------|
| POST   | /api/auth/login             | Email-based login            |
| GET    | /api/auth/me                | Current user info            |
| GET    | /api/files                  | List files (paginated)       |
| GET    | /api/files/stats            | Library statistics           |
| GET    | /api/files/:id              | Single file details          |
| POST   | /api/files/upload           | Upload files (multipart)     |
| PUT    | /api/files/:id              | Update file metadata         |
| DELETE | /api/files/:id              | Delete a file                |
| GET    | /api/files/:id/download     | Download a file              |
| GET    | /api/files/:id/preview      | Preview a file               |
| POST   | /api/files/:id/favorite     | Toggle favorite              |
| GET    | /api/collections            | List collections             |
| POST   | /api/collections            | Create collection            |
| PUT    | /api/collections/:id        | Update collection            |
| DELETE | /api/collections/:id        | Delete collection            |

### Supported File Types

- **Images**: JPEG, PNG, GIF, WebP, SVG
- **PDFs**: PDF documents
- **eBooks**: EPUB
- **Documents**: DOC, DOCX, TXT, RTF, XLS, XLSX, PPT, PPTX
