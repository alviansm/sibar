import { db, sqlite } from './index';
import { users, projects, outlines, problems, problem_attempts } from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { cryptoNativeUUID } from '../lib/utils';

async function seed() {
  console.log('🌱 Starting Sibar database initialization & seed...');

  // Ensure tables exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      reference_material TEXT NOT NULL,
      target_milestone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outlines (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      parent_id TEXT,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'unvisited',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS problems (
      id TEXT PRIMARY KEY,
      outline_id TEXT NOT NULL REFERENCES outlines(id) ON DELETE CASCADE,
      problem_statement TEXT NOT NULL,
      solution_guide TEXT NOT NULL,
      problem_type TEXT NOT NULL,
      options_json TEXT,
      difficulty INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS problem_attempts (
      id TEXT PRIMARY KEY,
      problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      outline_id TEXT NOT NULL REFERENCES outlines(id) ON DELETE CASCADE,
      time_spent_seconds INTEGER NOT NULL,
      attempt_number INTEGER NOT NULL DEFAULT 1,
      outcome TEXT NOT NULL,
      handwritten_file_path TEXT,
      ai_feedback_json TEXT,
      friction_score INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );
  `);

  const now = Math.floor(Date.now() / 1000);

  // 1. Seed User
  const adminUsername = process.env.ADMIN_USERNAME || 'admin-sibar';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Merdeka1945ID!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const existingLegacy = db.select().from(users).where(eq(users.username, 'admin')).get();
  if (existingLegacy) {
    db.update(users)
      .set({ username: adminUsername, password_hash: passwordHash })
      .where(eq(users.id, existingLegacy.id))
      .run();
    console.log(`✅ Updated legacy user to (${adminUsername})`);
  } else {
    const existingTarget = db.select().from(users).where(eq(users.username, adminUsername)).get();
    if (!existingTarget) {
      const userId = cryptoNativeUUID();
      db.insert(users)
        .values({
          id: userId,
          username: adminUsername,
          password_hash: passwordHash,
          created_at: now,
        })
        .run();
      console.log(`✅ Created admin user (${adminUsername})`);
    } else {
      db.update(users)
        .set({ password_hash: passwordHash })
        .where(eq(users.id, existingTarget.id))
        .run();
      console.log(`✅ Updated admin user credentials (${adminUsername})`);
    }
  }

  // 2. Seed Sample Calculus Project
  const existingProject = db.select().from(projects).get();
  let projectId = existingProject?.id;

  if (!existingProject) {
    projectId = cryptoNativeUUID();
    db.insert(projects)
      .values({
        id: projectId,
        name: 'Calculus',
        slug: 'calculus-varberg',
        reference_material: 'Calculus 9th Ed. - Dale Varberg, Edwin Purcell, Steve Rigdon',
        target_milestone: 'Drone Dynamics & Grad School Prep',
        status: 'active',
        created_at: now,
      })
      .run();
    console.log('✅ Created sample Calculus project');
  }

  if (projectId) {
    // Check if outlines exist
    const existingOutlines = db.select().from(outlines).all();
    if (existingOutlines.length === 0) {
      // Chapter 0
      const ch0Id = cryptoNativeUUID();
      db.insert(outlines)
        .values({
          id: ch0Id,
          project_id: projectId,
          parent_id: null,
          code: 'Ch 0',
          title: 'Preliminaries',
          description: 'Fundamental algebraic structures, coordinate systems, and functions.',
          sort_order: 0,
          status: 'in_progress',
          created_at: now,
        })
        .run();

      const sub01Id = cryptoNativeUUID();
      db.insert(outlines)
        .values({
          id: sub01Id,
          project_id: projectId,
          parent_id: ch0Id,
          code: '0.1',
          title: 'Real Numbers & Logic',
          description: 'Rational, irrational numbers, decimal expansions, and logic bounds.',
          sort_order: 1,
          status: 'mastered',
          created_at: now,
        })
        .run();

      const sub04Id = cryptoNativeUUID();
      db.insert(outlines)
        .values({
          id: sub04Id,
          project_id: projectId,
          parent_id: ch0Id,
          code: '0.4',
          title: 'Graphs of Equations',
          description: 'Symmetry, intercepts, equations of circles, and lines.',
          sort_order: 2,
          status: 'in_progress',
          created_at: now,
        })
        .run();

      // Chapter 1
      const ch1Id = cryptoNativeUUID();
      db.insert(outlines)
        .values({
          id: ch1Id,
          project_id: projectId,
          parent_id: null,
          code: 'Ch 1',
          title: 'Functions and Limits',
          description: 'Rigorous definitions of limits, continuity, and properties.',
          sort_order: 10,
          status: 'unvisited',
          created_at: now,
        })
        .run();

      const sub11Id = cryptoNativeUUID();
      db.insert(outlines)
        .values({
          id: sub11Id,
          project_id: projectId,
          parent_id: ch1Id,
          code: '1.1',
          title: 'Functions and Their Graphs',
          description: 'Domain, range, function composition, and transformations.',
          sort_order: 11,
          status: 'unvisited',
          created_at: now,
        })
        .run();

      const sub12Id = cryptoNativeUUID();
      db.insert(outlines)
        .values({
          id: sub12Id,
          project_id: projectId,
          parent_id: ch1Id,
          code: '1.2',
          title: 'Introduction to Limits',
          description: 'Intuitive limit concept and epsilon-delta formalism.',
          sort_order: 12,
          status: 'unvisited',
          created_at: now,
        })
        .run();

      console.log('✅ Seeded outlines tree');

      // Seed Problems under subchapter 0.4
      const p1Id = cryptoNativeUUID();
      db.insert(problems)
        .values({
          id: p1Id,
          outline_id: sub04Id,
          problem_statement:
            'Derive the standard equation of a circle centered at $(h, k)$ with radius $r > 0$ using the Euclidean distance formula.',
          solution_guide:
            'By definition, a circle is the set of all points $(x, y)$ at distance $r$ from $(h, k)$.\n\nUsing the distance formula:\n$$\\sqrt{(x - h)^2 + (y - k)^2} = r$$\n\nSquaring both sides:\n$$(x - h)^2 + (y - k)^2 = r^2$$',
          problem_type: 'derivation',
          difficulty: 2,
          created_at: now,
        })
        .run();

      const p2Id = cryptoNativeUUID();
      db.insert(problems)
        .values({
          id: p2Id,
          outline_id: sub04Id,
          problem_statement:
            'Find all $x$-intercepts and $y$-intercepts of the parabola $y = x^2 - 4x + 3$.',
          solution_guide:
            '1. **$y$-intercept** (set $x = 0$):\n$$y = 0^2 - 4(0) + 3 = 3 \\implies (0, 3)$$\n\n2. **$x$-intercepts** (set $y = 0$):\n$$x^2 - 4x + 3 = 0 \\implies (x - 1)(x - 3) = 0$$\nThus $x = 1$ and $x = 3$, giving intercepts at $(1, 0)$ and $(3, 0)$.',
          problem_type: 'calculation',
          difficulty: 2,
          created_at: now,
        })
        .run();

      const p3Id = cryptoNativeUUID();
      db.insert(problems)
        .values({
          id: p3Id,
          outline_id: sub04Id,
          problem_statement:
            'Which of the following functions exhibits origin symmetry (i.e. is an odd function)?',
          solution_guide:
            'A graph is symmetric with respect to the origin if replacing $(x, y)$ with $(-x, -y)$ yields an equivalent equation.\n\nEvaluating $y = x^3 - x$:\n$$-y = (-x)^3 - (-x) = -x^3 + x = -(x^3 - x) \\implies y = x^3 - x$$\nHence, $y = x^3 - x$ is odd and origin-symmetric.',
          problem_type: 'multiple_choice',
          options_json: JSON.stringify([
            '$y = x^3 - x$',
            '$y = x^2 + 1$',
            '$y = x^3 + 2$',
            '$y = |x|$',
          ]),
          difficulty: 3,
          created_at: now,
        })
        .run();

      console.log('✅ Seeded math problems for subchapter 0.4');

      // Seed a historical attempt for telemetry calculations
      const attemptId = cryptoNativeUUID();
      db.insert(problem_attempts)
        .values({
          id: attemptId,
          problem_id: p1Id,
          outline_id: sub04Id,
          time_spent_seconds: 345, // 5 min 45 sec
          attempt_number: 1,
          outcome: 'clean_solve',
          friction_score: 2,
          ai_feedback_json: JSON.stringify({
            correctness: '100%',
            verdict: 'Rigorous derivation using Euclidean metric.',
            suggestions: 'Next step: test general second-degree conic equations.',
          }),
          created_at: now - 3600 * 2, // 2 hours ago
        })
        .run();

      console.log('✅ Seeded sample attempt telemetry');
    }
  }

  console.log('🎉 Sibar seed completed successfully!');
}

seed().catch((err) => {
  console.error('❌ Error seeding database:', err);
  process.exit(1);
});
