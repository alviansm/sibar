# Sibar Development Roadmap & TODO

Tracked features, improvements, and architectural tasks for **Sibar** (STEM study telemetry, syllabus digitizer, and practice app).

---

## Task Summary

- [ ] **1. Time-Completion & Target Set Prediction for Study Projects**
- [ ] **2. Universal Application Footer Page & Layout Component**
- [ ] **3. Statistics & Telemetry Analytics Page**
- [ ] **4. Dynamic Clickable Breadcrumb Navigation**
- [ ] **5. Google Auth & Google Drive Cloud Integration**
- [ ] **6. Gemini AI "Explain Quote" Interactive Feature**
- [ ] **7. Hybrid Problem Generation (Combined MCQ & Essay Exercise Sets)**

---

## Detailed Task Breakdown

### 1. Time-Completion and Target Set Prediction for a Study Project
> Predict remaining study duration, daily targets, and target completion dates based on learning telemetry and historical velocity.

- [ ] **Data Model & Schema Extensions**
  - [ ] Add `target_completion_date` and `daily_target_reps` fields to `projects` table in Drizzle schema.
  - [ ] Track user speed metrics (average minutes per concept, average solve time per problem type) in session attempt logs.
- [ ] **Backend Telemetry & Analytics Engine**
  - [ ] Create predictive algorithm utility (`predictCompletion.ts`) calculating estimated finish date based on remaining items vs. 7-day rolling velocity.
  - [ ] Implement target-setting calculator estimating required daily reps to hit user-defined goal dates.
- [ ] **UI Components & Project Dashboard Integration**
  - [ ] Add "Completion Forecast & Target Setting" card to project detail page (`/projects/[slug]`).
  - [ ] Display visual velocity bar, estimated completion date badge, and "On Track / Behind Schedule" status indicator.
  - [ ] Allow users to edit target completion date and adjust target daily goals dynamically.

---

### 2. Universal Application Footer Page & Layout Component
> Provide a persistent, responsive, dark-mode styled footer across all application views.

- [ ] **Footer Component Implementation (`Footer.tsx`)**
  - [ ] Design sleek glassmorphism footer layout consistent with existing UI system.
  - [ ] Include Sibar brand logo, tagline, version badge, and build environment tag.
  - [ ] Add navigation quick-links: Dashboard, Projects, Statistics, Settings, and Documentation.
  - [ ] Add GitHub repository link, license notice, and credits.
- [ ] **Layout Integration**
  - [ ] Update `src/app/layout.tsx` to include `<Footer />` wrapped in main flex container.
  - [ ] Ensure layout correctly handles sticky footer behavior (`min-h-screen flex flex-col justify-between`).

---

### 3. Statistics & Telemetry Analytics Page
> Dedicated analytics view providing comprehensive study insights, mastery metrics, and session telemetry.

- [ ] **Route & Page Setup**
  - [ ] Create route `/statistics` (global overview) and optional project scope `/projects/[slug]/statistics`.
  - [ ] Implement server component fetching aggregate user attempt stats, accuracy ratios, and time logs.
- [ ] **Interactive Visualizations & Telemetry Charts**
  - [ ] **Study Activity Heatmap:** GitHub-style daily study intensity grid.
  - [ ] **Accuracy Breakdown Chart:** MCQ vs Essay performance comparison, chapter accuracy distribution.
  - [ ] **Pace & Time Spent:** Time distribution by course/topic using chart components.
  - [ ] **Concept Mastery Matrix:** Subchapter readiness indicator based on correct attempt ratios.
- [ ] **Filter & Export Controls**
  - [ ] Date range selector (Last 7 Days, 30 Days, All Time).
  - [ ] Project/Course dropdown filter.
  - [ ] CSV/JSON summary export feature for telemetry data.

---

### 4. Dynamic Clickable Breadcrumb Navigation
> Interactive breadcrumb header allowing single-click hierarchical navigation across nested pages.

- [ ] **Breadcrumb Component (`Breadcrumb.tsx`)**
  - [ ] Build reusable component accepting route segments and metadata.
  - [ ] Handle dynamic URL parameter mapping (e.g., `Projects > Calculus I > Chapter 2: Derivatives > Subchapter 2.1`).
- [ ] **Styling & User Experience**
  - [ ] Modern chevron/slash separators with hover states and subtle truncation for long titles.
  - [ ] Clickable links for all parent path levels enabling seamless backward navigation.
- [ ] **Global & Page Banner Integration**
  - [ ] Embed breadcrumbs in top page header layout and project/exercise headers.

---

### 5. Google Auth & Google Drive Connect
> Cloud integration enabling OAuth login, database cloud backup, and direct file import/export.

- [ ] **Google OAuth 2.0 Authentication**
  - [ ] Configure Google OAuth consent screen & API credentials in Google Cloud Console.
  - [ ] Implement Next.js OAuth sign-in flow (`/api/auth/google/callback`).
  - [ ] Link Google account email/profile to existing user sessions.
- [ ] **Google Drive Integration**
  - [ ] Request Google Drive read/write scope (`drive.file`).
  - [ ] Add "Connect Google Drive" management UI in `/settings`.
  - [ ] **Cloud Backup:** One-click SQLite database export / sync to user's Google Drive storage.
  - [ ] **PDF & Syllabus Import:** Import textbook PDFs/syllabi directly from Google Drive into Gemini OCR pipeline.
  - [ ] **Export Reports:** Save generated practice session reports and problem sets to Drive.

---

### 6. AI "Explain Quote" Interactive Button
> Leverage Gemini AI to explain and contextualize motivational quotes on the dashboard.

- [ ] **Dashboard Quote Component Enhancement (`DashboardQuote.tsx`)**
  - [ ] Add an "Explain Quote" / "Spark Context" action button next to the quote refresh control.
  - [ ] Implement modal or expandable drawer displaying AI-generated explanation.
- [ ] **Backend API & Gemini Prompting (`/api/quotes/explain`)**
  - [ ] Create server action / API route calling `@google/genai` (Gemini 2.5 Flash).
  - [ ] Prompt template: Contextualize quote with STEM mindset, practical learning strategies, and deep philosophical insight.
  - [ ] Support loading state animation, caching, and retry handling.

---

### 7. Hybrid Exercise Generation (Mixed Essay & MCQ Practice Sets)
> Fix practice set generator to create balanced sets combining essay questions and multiple-choice questions.

- [ ] **Exercise Generation UI Upgrades (`/projects/[slug]/generate`)**
  - [ ] Replace single format selector with flexible format distribution options:
    - *All MCQ*, *All Essay*, or *Hybrid / Mixed Set*.
  - [ ] Add sliders/numeric inputs to specify exact count (e.g., 5 MCQ + 3 Essay).
- [ ] **Gemini Prompt & JSON Schema Tuning (`/api/exercises/generate`)**
  - [ ] Update Gemini structured JSON response schema to accept heterogeneous problem arrays (containing both `mcq` and `essay` types in a single request).
  - [ ] Enforce correct answer options for MCQs and structured solution steps / rubrics for Essay questions.
- [ ] **Practice Session & Grading Engine Adaptations**
  - [ ] Ensure mixed practice UI renders MCQ radio selections and Essay textareas side-by-side seamlessly.
  - [ ] Support mixed automatic scoring: instant check for MCQs + self-grading/rubric check for Essays in the same session summary.
