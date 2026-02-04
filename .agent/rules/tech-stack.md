# Tech Stack: Second Brain

## Core Principles
- **Standalone**: Must run without external services (except optional Vector Store).
- **No-Build**: Frontend utilizes Vanilla ES6 Modules. No Webpack/Vite required for basic usage.
- **Local-First**: Data persistence via filesystem (JSON).

## Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Storage**: Custom `BrainStorage` class writing to `data/brain/personal_brain.json`.
- **API**: RESTful JSON API under `/api/brain`.

## Frontend
- **Language**: JavaScript (ES6 Modules)
- **Framework**: None (Vanilla JS). DOM manipulation via `document.getElementById` and `innerHTML`.
- **CSS**: Functional/Utility classes (similar to Tailwind ideas but custom implementation or externally provided).
- **Communication**: Custom `ApiClient` class (Fetch API wrapper).

## Development
- **Start**: `npm start`
- **Dev**: `npm run dev` (Node Watch mode)
