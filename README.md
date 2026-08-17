# Sibar

> Sinau Bareng Archive: STEM study telemetry, syllabus digitizer, and problem practice app.

Sibar is a web application designed to help organize and practice STEM course material (Calculus, Physics, Engineering, Computer Science). It uses Google Gemini to digitize textbook tables of contents into structured syllabus taxonomies, supports LaTeX formula rendering with KaTeX, provides interactive practice sets, and tracks study progress.

> **Note:** This project is primarily vibe-coded for personal use and self-hosting. It is provided as-is, so expect rough edges, rapid changes, and highly opinionated defaults.

## Features

### Syllabus Extraction via OCR
- Upload photos or screenshots of textbook tables of contents or syllabi.
- Uses Gemini to extract chapter and subchapter hierarchies into the database.
- Exponential backoff retry handling for API rate limits.

### Practice Sets and Problem Reps
- **Multiple Choice and Essay Formats:** Create or generate problem sets with interactive options, correct answer keys, and detailed solutions.
- **Single Problem Practice:** Target 1-off problem reps to test individual formulas or concepts.
- **Bulk OCR Digitization:** Extract problem statements, LaTeX equations, and answer keys directly from textbook exercise pages.

### Concepts and Formula Management
- Organize subchapters, definitions, theorems, and LaTeX formulas.
- Worked examples with step-by-step reasoning guides and toggleable hints.
- Expandable concept cards to review notes before marking them complete.

### Progress Tracking
- Progress indicators for subchapters based on completed concepts and solved problems.
- Real-time progress updates across chapters and subchapters.

### Practice Sessions and Grading
- Timed and untimed study sessions with milestone timer alerts.
- Automatic score calculation and accuracy ratios.
- Review mode to inspect past attempts, student choices, and full step-by-step LaTeX solution breakdowns.
- Option to retake exercise sets.

### Data Management
- Soft deletion for projects, taxonomy chapters, problems, and attempt logs.
- Confirmation modals for deletion operations.

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19
- **Language:** TypeScript
- **Database & ORM:** SQLite (`better-sqlite3`), Drizzle ORM
- **AI:** Google GenAI SDK (`@google/genai`)
- **Math Rendering:** KaTeX (`react-katex`)
- **Styling & UI:** Tailwind CSS, Lucide Icons, Lottie React
- **Authentication:** Stateless JWT (`jose`) in HttpOnly cookies, `bcryptjs`

## Getting Started

### Prerequisites

- Node.js 18.17+ (v20 recommended)
- npm, yarn, or pnpm
- Google Gemini API key

### Obtaining a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Log in with your Google account.
3. Click **Get API key** in the sidebar, then select **Create API key**.
4. Choose an existing Google Cloud project or create a new one.
5. Copy the generated key and assign it to `GEMINI_API_KEY` in your `.env` file.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/sibar.git
   cd sibar
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in your secrets:
   ```env
   SESSION_SECRET="your-super-secret-jwt-key-min-32-chars-long"
   GEMINI_API_KEY="YourGeminiApiKeyHere"
   DATABASE_URL="sibar.db"
   ADMIN_USERNAME="admin-sibar"
   ADMIN_PASSWORD="Merdeka1945ID!"
   ```

4. Initialize database:
   ```bash
   npm run seed
   ```

5. Start the server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

Default credentials:
- Username: `admin-sibar`
- Password: `Merdeka1945ID!`

Security features:
- **IP Rate Limiting:** Maximum 5 failed login attempts per IP address in a 30-minute window.
- **STEM Math Captcha:** Dynamic HMAC-signed math challenge on every login attempt to block crawlers and bot scripts.

## Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run dev` | `next build && next start` | Production-like pre-rendered build for quick UI testing |
| `npm run dev:watch` | `next dev` | Next.js development server with hot reloading |
| `npm run dev:turbo` | `next dev --turbo` | Next.js Turbopack development server |
| `npm run build` | `next build` | Build for production |
| `npm run start` | `next start` | Run production build |
| `npm run seed` | `tsx src/db/seed.ts` | Reset and seed SQLite database with initial calculus course data |

## Credits & Attributions

- **Favicon & Brand Icon:** "Study learning knowledge education Icon" by [Soni Sokell](https://icon-icons.com/authors/979-soni-sokell) via [Icon-Icons.com](https://icon-icons.com/).

## License

MIT

