# CodeVision AI

**AI-Powered Code Learning Platform** — Optimize code, understand algorithms, and build problem-solving skills with interactive visualizations and AI-driven explanations.

## Features

### Core Features
- **Code Optimization** — Analyze code for inefficiencies, get optimized versions with before/after complexity comparison
- **Line-by-Line Explanation** — Beginner-friendly explanation of each line with data state tracking and real-world analogies
- **Algorithm Animation** — Step-by-step visual animations for sorting, searching, tree/graph traversal, stack/queue operations
- **Teaching Storyboard** — Slide-based animated explanation player that teaches like a video lesson
- **Problem-Solving Assistant** — Multiple solution approaches (brute-force → optimized) with dry runs, edge cases, and interview tips
- **Data Structure Playground** — Interactive operations on arrays, linked lists, stacks, queues, trees, graphs, heaps with code mapping
- **Logic Builder** — Drag-and-drop visual algorithm builder that converts to source code
- **Code-to-Visual & Visual-to-Code** — Bidirectional conversion between code and visual representations

### Multi-Level Support
- **Beginner** — Simple explanations, real-world analogies, slower animations, extra hints
- **Intermediate** — More technical explanations with deeper detail
- **Advanced** — Deep optimization analysis, edge cases, trade-offs

### Supported Languages
- Python, JavaScript, Java, C++
- Architecture designed for easy addition of more languages

## Architecture

```
codevision-ai/
├── backend/                    # Node.js/Express API server
│   ├── src/
│   │   ├── index.js           # Server entry point
│   │   ├── database/          # SQLite initialization and schema
│   │   ├── routes/            # API route handlers
│   │   │   ├── analyze.js     # Code analysis endpoint
│   │   │   ├── explain.js     # Line-by-line explanation
│   │   │   ├── optimize.js    # Code optimization
│   │   │   ├── animation.js   # Algorithm animation + storyboard
│   │   │   ├── problem.js     # Problem-solving assistant
│   │   │   ├── session.js     # Session CRUD
│   │   │   └── playground.js  # Data structure operations + visual-to-code
│   │   ├── services/          # External service integrations
│   │   │   └── openai.js      # OpenAI GPT-4 client
│   │   ├── prompts/           # AI prompt templates
│   │   │   └── index.js       # All prompt definitions
│   │   └── middleware/        # Request validation
│   │       └── validate.js    # Joi schemas
│   └── package.json
├── frontend/                   # Next.js + Tailwind CSS + Framer Motion
│   ├── src/
│   │   ├── app/               # Next.js App Router pages
│   │   │   ├── layout.tsx     # Root layout
│   │   │   ├── page.tsx       # Main application page
│   │   │   └── globals.css    # Global styles and theme
│   │   ├── components/        # React components by feature
│   │   │   ├── ui/            # Shared UI (Sidebar, LoadingSpinner, ErrorBanner)
│   │   │   ├── code-editor/   # Code input, syntax highlighting, explanation view
│   │   │   ├── complexity/    # Optimization comparison view
│   │   │   ├── algorithm-animation/ # Animation player + generator
│   │   │   ├── storyboard/   # Teaching storyboard player
│   │   │   ├── problem-solver/ # Problem input + result views
│   │   │   ├── data-structures/ # Interactive playground
│   │   │   └── logic-builder/ # Drag-and-drop visual builder
│   │   ├── hooks/             # Custom React hooks
│   │   │   └── useCodeVision.ts # Main application state
│   │   ├── lib/               # Utilities
│   │   │   └── api.ts         # Backend API client
│   │   └── types/             # TypeScript type definitions
│   │       └── index.ts       # All shared types
│   └── package.json
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Animations | Framer Motion, SVG-based visualizations |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |
| Syntax Highlighting | react-syntax-highlighter |
| Backend | Node.js, Express.js |
| AI | OpenAI GPT-4o API |
| Database | SQLite (better-sqlite3) |
| Validation | Joi |

## Database Schema

```sql
sessions          -- Tracks user learning sessions
├── explanations  -- AI-generated code explanations (FK → sessions)
├── optimizations -- Code optimization results (FK → sessions)
├── animations    -- Algorithm animation step data (FK → sessions)
└── problems      -- Problem analysis results (FK → sessions)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze` | Comprehensive code analysis |
| POST | `/api/explain` | Line-by-line code explanation |
| POST | `/api/optimize` | Code optimization with complexity comparison |
| POST | `/api/animation/generate` | Generate algorithm animation steps |
| POST | `/api/animation/storyboard` | Generate teaching storyboard slides |
| POST | `/api/problem/solve` | Problem-solving with multiple approaches |
| POST | `/api/playground/operate` | Data structure operation visualization |
| POST | `/api/playground/visual-to-code` | Convert visual logic blocks to code |
| GET | `/api/session` | List all sessions |
| GET | `/api/session/:id` | Get session with all related data |
| DELETE | `/api/session/:id` | Delete a session |
| GET | `/health` | Health check |

## Getting Started

### Prerequisites
- Node.js 18+
- OpenAI API key

### Backend Setup
```bash
cd codevision-ai/backend
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
npm install
npm run dev    # Starts on port 3002
```

### Frontend Setup
```bash
cd codevision-ai/frontend
npm install
npm run dev    # Starts on port 3000
```

### Environment Variables

**Backend (.env)**
| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 | Required |
| `PORT` | Server port | 3002 |
| `CORS_ORIGIN` | Frontend URL for CORS | http://localhost:3000 |
| `DB_PATH` | SQLite database path | ./data/codevision.db |

**Frontend (.env.local)**
| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | http://localhost:3002/api |

## Animation Data Model (Sample JSON)

```json
{
  "algorithmName": "Bubble Sort",
  "steps": [
    {
      "stepNumber": 1,
      "operation": "compare",
      "description": "Compare elements at index 0 and 1",
      "highlightIndices": [0, 1],
      "state": {
        "elements": [64, 34, 25, 12],
        "variables": { "i": 0, "j": 0 }
      },
      "explanation": "We check if 64 > 34. Since it is, we will swap them."
    }
  ]
}
```

## Roadmap

### Phase 1 (MVP) — Current
- Code analysis, explanation, optimization
- Algorithm animation player
- Teaching storyboard
- Problem-solving assistant
- Data structure playground
- Logic builder

### Phase 2
- Voice narration for explanations
- Real-time complexity chart
- Compare two solutions side by side
- User accounts and progress tracking
- Interview mode with timed challenges

### Phase 3
- Quiz mode
- Debugging mode
- Code smell detection
- Personalized recommendations
- Collaborative learning sessions
- Mobile-responsive design improvements
