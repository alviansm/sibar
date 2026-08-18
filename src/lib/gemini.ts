import { GoogleGenAI } from '@google/genai';

export interface ParsedProblemResult {
  problem_statement: string;
  solution_guide: string;
  problem_type: 'derivation' | 'calculation' | 'multiple_choice';
  options: string[] | null;
  correct_option_index?: number | null;
  difficulty: number;
}

export function shuffleProblemOptions<T extends { options?: string[] | null; correct_option_index?: number | null }>(item: T): T {
  if (!item.options || !Array.isArray(item.options) || item.options.length < 2) {
    return item;
  }

  const rawCorrectIndex =
    typeof item.correct_option_index === 'number' &&
    item.correct_option_index >= 0 &&
    item.correct_option_index < item.options.length
      ? item.correct_option_index
      : 0;

  // Map each option with a flag indicating if it is the correct answer
  const itemsWithFlag = item.options.map((opt, idx) => ({
    text: opt,
    isCorrect: idx === rawCorrectIndex,
  }));

  // Fisher-Yates shuffle to randomize options
  for (let i = itemsWithFlag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = itemsWithFlag[i];
    itemsWithFlag[i] = itemsWithFlag[j];
    itemsWithFlag[j] = temp;
  }

  const shuffledOptions = itemsWithFlag.map((x) => x.text);
  const newCorrectIndex = itemsWithFlag.findIndex((x) => x.isCorrect);

  return {
    ...item,
    options: shuffledOptions,
    correct_option_index: newCorrectIndex !== -1 ? newCorrectIndex : 0,
  };
}

export interface AIGradeFeedback {
  correctness: string;
  verdict: string;
  suggestions: string;
}

export const AVAILABLE_GEMINI_MODELS = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Fast & Recommended)' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (High Reasoning)' },
];

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.includes('YOUR_GEMINI_API_KEY')) {
    throw new Error('GEMINI_API_KEY is not configured. Please set a valid API key from https://aistudio.google.com/ in your .env file.');
  }
  return new GoogleGenAI({ apiKey });
}

async function generateContentWithFallback(
  ai: GoogleGenAI,
  primaryModel: string,
  contents: any,
  config: any
) {
  const fallbackModels = [
    primaryModel,
    'gemini-3.6-flash',
    'gemini-3.1-pro-preview',
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  let lastError: any = null;

  for (const model of fallbackModels) {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config,
        });
        return { response, usedModel: model };
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isApiKeyError =
          err?.status === 400 ||
          errMsg.includes('API key not valid') ||
          errMsg.includes('API_KEY_INVALID') ||
          errMsg.includes('INVALID_ARGUMENT');

        if (isApiKeyError) {
          throw new Error('Invalid Gemini API Key. Please update your GEMINI_API_KEY in .env with a valid key from https://aistudio.google.com/.');
        }

        const isTransient =
          err?.status === 503 ||
          err?.status === 429 ||
          err?.code === 503 ||
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE');

        console.warn(
          `Gemini model '${model}' attempt ${attempt}/${maxRetries} failed:`,
          errMsg
        );
        lastError = err;

        if (isTransient && attempt < maxRetries) {
          const delayMs = attempt * 2000;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          break; // Fail immediately on non-transient errors (like 404) to try next fallback model
        }
      }
    }
  }

  throw lastError || new Error('All Gemini AI model attempts failed.');
}

export async function parseProblemImage(
  imageBase64: string,
  mimeType: string = 'image/png',
  modelName: string = 'gemini-3.6-flash'
): Promise<ParsedProblemResult> {
  const ai = getGeminiClient();
  
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const prompt = `You are an expert STEM LaTeX & Math Digitizer. 
Examine the uploaded image containing a mathematical or engineering problem.
Transcribe and extract the problem with high precision.

SPECIAL RENDERING ENGINE CAPABILITIES (APPLY WHEN RELEVANT):
1. Cartesian Plane / 2D Function Graphs:
If the image problem contains a graph, coordinate plane, curve (parabola, line, polynomial, trigonometric wave, exponential, etc.) or geometric plot:
Convert the visual curve into an interactive \`\`\`plot code block in the "problem_statement" (or "solution_guide"):
\`\`\`plot
fn: <function expression(s), e.g. x^2 - 4 or sin(x) or 2*x + 1>
range: [<xMin>, <xMax>]
yDomain: [<yMin>, <yMax>]
points: [[x1, y1, "Label 1"], [x2, y2, "Label 2"]]
grid: true
title: <Descriptive Graph Title>
\`\`\`
2. Graph Theory / Network Diagrams / Flowcharts:
If the problem features nodes, edges, trees, or state machines, render them using a \`\`\`mermaid code block.
3. Standard LaTeX Math:
Always wrap inline equations with $...$ and standalone equations with $$...$$.

Return ONLY a valid JSON object matching the following TypeScript interface (no markdown code fence formatting outside the JSON if possible, just raw valid JSON):

{
  "problem_statement": "Markdown string containing clean LaTeX math inline ($...$) or display ($$...$$), plus optional \`\`\`plot or \`\`\`mermaid blocks if visual graphs appear in the problem.",
  "solution_guide": "Step-by-step LaTeX derivation or reference solution key.",
  "problem_type": "derivation" | "calculation" | "multiple_choice",
  "options": ["Option A LaTeX", "Option B LaTeX", "Option C LaTeX", "Option D LaTeX"] or null if not multiple choice,
  "correct_option_index": 0-based integer index of the correct option (0, 1, 2, or 3) if multiple choice, or null,
  "difficulty": integer from 1 (easy/introductory) to 5 (advanced olympiad/grad level)
}

If multiple choice:
- Randomly distribute the position of the correct answer across options (0 for A, 1 for B, 2 for C, 3 for D). Do NOT always make option A (index 0) the correct answer.
- Ensure "correct_option_index" matches the exact location of the correct option.

Ensure all mathematical expressions use standard LaTeX notation (e.g., \\frac{a}{b}, \\lim_{x \\to \\infty}, \\int_a^b).`;

  try {
    const { response } = await generateContentWithFallback(
      ai,
      modelName || 'gemini-3.6-flash',
      [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType,
              },
            },
          ],
        },
      ],
      { responseMimeType: 'application/json' }
    );

    const responseText = response.text || '';
    const parsed = JSON.parse(responseText.trim());
    
    const problem: ParsedProblemResult = {
      problem_statement: parsed.problem_statement || 'Transcribed problem statement',
      solution_guide: parsed.solution_guide || 'Step-by-step solution derivation',
      problem_type: ['derivation', 'calculation', 'multiple_choice'].includes(parsed.problem_type)
        ? parsed.problem_type
        : 'calculation',
      options: Array.isArray(parsed.options) ? parsed.options : null,
      correct_option_index: typeof parsed.correct_option_index === 'number' ? parsed.correct_option_index : 0,
      difficulty: typeof parsed.difficulty === 'number' ? Math.min(5, Math.max(1, parsed.difficulty)) : 3,
    };

    return shuffleProblemOptions(problem);
  } catch (error) {
    console.error(`Error parsing problem image with Gemini:`, error);
    throw error;
  }
}

export async function generateAttemptFeedback(
  problemStatement: string,
  solutionGuide: string,
  userNotesOrAnswer: string,
  modelName: string = 'gemini-3.6-flash'
): Promise<AIGradeFeedback> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        correctness: 'Self-Evaluated',
        verdict: 'Attempt logged successfully.',
        suggestions: 'Set GEMINI_API_KEY for automatic AI grading telemetry.',
      };
    }

    const ai = getGeminiClient();
    const prompt = `You are Sibar's AI Telemetry Coach. Analyze the student's solution attempt against the reference guide.

Problem Statement:
${problemStatement}

Reference Solution Guide:
${solutionGuide}

Student Attempt Notes / Answer:
${userNotesOrAnswer}

Provide structured feedback in JSON format:
{
  "correctness": "e.g. 100% Correct / Partial Match / Minor Error",
  "verdict": "Brief 1-2 sentence assessment of their logical steps.",
  "suggestions": "Actionable tip for future reps."
}`;

    const { response } = await generateContentWithFallback(
      ai,
      modelName || 'gemini-3.6-flash',
      [{ role: 'user', parts: [{ text: prompt }] }],
      { responseMimeType: 'application/json' }
    );

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return {
      correctness: parsed.correctness || 'Complete',
      verdict: parsed.verdict || 'Good effort on completing this rep.',
      suggestions: parsed.suggestions || 'Keep practicing similar problem archetypes.',
    };
  } catch (err) {
    console.warn('AI feedback generation warning:', err);
    return {
      correctness: 'Recorded',
      verdict: 'Attempt recorded into telemetry archive.',
      suggestions: 'Review reference solution steps.',
    };
  }
}

export interface ParsedSubchapter {
  code: string;
  title: string;
  description?: string;
  problems?: ParsedProblemResult[];
}

export interface ParsedChapter {
  code: string;
  title: string;
  description?: string;
  subchapters: ParsedSubchapter[];
}

export interface ParsedTaxonomyResult {
  is_valid_syllabus: boolean;
  error_message: string | null;
  chapters: ParsedChapter[];
}

export async function parseTaxonomyImages(
  images: { base64: string; mimeType: string }[],
  generateProblems: boolean = false,
  modelName: string = 'gemini-3.6-flash'
): Promise<ParsedTaxonomyResult> {
  const ai = getGeminiClient();

  const imageParts = images.map((img) => ({
    inlineData: {
      data: img.base64.replace(/^data:image\/\w+;base64,/, ''),
      mimeType: img.mimeType || 'image/png',
    },
  }));

  const prompt = `You are an expert Curriculum & Syllabus Digitizer AI.
Examine the provided image(s) containing a textbook Table of Contents, syllabus, or course outline.

FIRST: Validate whether the uploaded image(s) contain a course table of contents, chapter outline, or textbook syllabus.
- If the image is NOT a table of contents / syllabus / course outline (e.g. photo of an animal, receipt, face, or unrelated text), return "is_valid_syllabus": false with a clear explanation in "error_message".
- If valid, set "is_valid_syllabus": true, set "error_message": null, and extract the complete hierarchy of chapters and subchapters.

${
  generateProblems
    ? 'ALSO: For EACH subchapter, auto-generate 1 to 2 realistic math/engineering problem reps written in clean LaTeX ($...$ and $$...$$) along with a step-by-step solution guide and problem type.'
    : 'DO NOT generate problems array if not requested.'
}

Return ONLY valid JSON matching this schema:
{
  "is_valid_syllabus": boolean,
  "error_message": string | null,
  "chapters": [
    {
      "code": "e.g. Ch 0 or Chapter 1",
      "title": "e.g. Preliminaries",
      "description": "Brief 1-sentence topic summary",
      "subchapters": [
        {
          "code": "e.g. 0.1",
          "title": "e.g. Real Numbers, Estimation, and Logic",
          "description": "Brief subchapter overview"
          ${
            generateProblems
              ? `, "problems": [
            {
              "problem_statement": "LaTeX Markdown problem statement",
              "solution_guide": "Step-by-step LaTeX solution key",
              "problem_type": "derivation",
              "options": null,
              "difficulty": 2
            }
          ]`
              : ''
          }
        }
      ]
    }
  ]
}`;

  try {
    const { response } = await generateContentWithFallback(
      ai,
      modelName || 'gemini-3.6-flash',
      [
        {
          role: 'user',
          parts: [{ text: prompt }, ...imageParts],
        },
      ],
      { responseMimeType: 'application/json' }
    );

    const responseText = response.text || '';
    const parsed = JSON.parse(responseText.trim());

    if (!parsed.is_valid_syllabus) {
      return {
        is_valid_syllabus: false,
        error_message:
          parsed.error_message ||
          'The uploaded image does not appear to contain a valid table of contents or course outline.',
        chapters: [],
      };
    }

    return {
      is_valid_syllabus: true,
      error_message: null,
      chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
    };
  } catch (error: any) {
    console.error(`Error parsing taxonomy with Gemini (${modelName}):`, error);
    return {
      is_valid_syllabus: false,
      error_message: error.message || 'Failed to parse table of contents image.',
      chapters: [],
    };
  }
}

export interface ParsedProblemSetItem {
  problem_statement: string;
  solution_guide: string;
  problem_type: 'derivation' | 'calculation' | 'multiple_choice' | 'essay';
  options: string[] | null;
  correct_option_index: number | null;
  difficulty: number;
}

export interface ParsedProblemSetResult {
  is_valid_problems: boolean;
  error_message: string | null;
  selection_rationale?: string | null;
  problems: ParsedProblemSetItem[];
}

export async function parseProblemSetImages(
  images: { base64: string; mimeType?: string }[],
  targetProblemType: 'multiple_choice' | 'essay' | 'auto' = 'auto',
  modelName: string = 'gemini-3.6-flash',
  userInstructions?: string
): Promise<ParsedProblemSetResult> {
  const ai = getGeminiClient();

  const imageParts = images.map((img) => ({
    inlineData: {
      data: img.base64.replace(/^data:image\/\w+;base64,/, ''),
      mimeType: img.mimeType || 'image/png',
    },
  }));

  const prompt = `You are an expert STEM Exam & Problem Set Digitizer AI.
Examine the provided textbook problem set image(s) (e.g. textbook page exercise sets, problem set 0.4, or exam sheets).

FIRST: Check if the image contains mathematical, scientific, or engineering problem statements.
- If invalid, set "is_valid_problems": false with explanation in "error_message".
- If valid, set "is_valid_problems": true, set "error_message": null, and extract all exercise problem statements.

${
  userInstructions && userInstructions.trim().length > 0
    ? `ADDITIONAL USER SPECIFIC INSTRUCTIONS / CUSTOM REQUIREMENTS:
"${userInstructions.trim()}"
Follow these custom instructions strictly (e.g., specific number of problems to select or generate, difficulty level, mixing problem formats such as 4 multiple choices and 1 essay, or creating similar variant problems rather than an exact copy).`
    : ''
}

For EACH problem:
1. Write the "problem_statement" in clean LaTeX ($...$ and $$...$$).
VISUAL & GRAPH CONVERSION (CRITICAL):
- If the problem in the image contains a Cartesian coordinate plane, function graph, curve (parabola, linear function, polynomial, sine/cosine wave, rational/exponential function), or geometric curve:
  CONVERT IT into an interactive \`\`\`plot code block inside "problem_statement" (or "solution_guide"):
  \`\`\`plot
  fn: <function expression, e.g. x^2 - 4 or 2*x + 1 or sin(x)>
  range: [<xMin>, <xMax>]
  yDomain: [<yMin>, <yMax>]
  points: [[x1, y1, "Label 1"], [x2, y2, "Label 2"]]
  grid: true
  title: <Descriptive Graph Title>
  \`\`\`
- If the problem features a network diagram, tree, state machine, or flowchart, convert it into a \`\`\`mermaid code block.
2. Write a comprehensive "solution_guide" with step-by-step reasoning key in LaTeX explaining how to arrive at the correct answer.
3. Set "problem_type": ${
    targetProblemType === 'multiple_choice'
      ? '"multiple_choice"'
      : targetProblemType === 'essay'
      ? '"essay"'
      : 'either "multiple_choice" or "essay" or "calculation"'
  }.
4. If "multiple_choice", provide "options": array of 4 distinct LaTeX choice strings (1 correct answer + 3 plausible wrong distractors), and "correct_option_index": 0-based index of correct option (0 for A, 1 for B, 2 for C, 3 for D).
CRITICAL FOR MULTIPLE CHOICE:
- Randomly and evenly distribute the correct answer index across all positions (0 for A, 1 for B, 2 for C, 3 for D) throughout the question set.
- NEVER put the correct answer always at option A (index 0). The correct answers MUST be varied and diverse across A, B, C, and D across the different questions.
- Ensure "correct_option_index" matches the exact location of the correct option in "options".
If not multiple choice, set "options": null and "correct_option_index": null.
5. Set "difficulty": number from 1 to 5.
6. In "selection_rationale", provide a concise 1 to 3 sentence explanation explaining the pedagogical reasoning behind why these specific problems were selected or generated based on the user's prompt (e.g. why they represent the core concepts, their difficulty progression, or how they align with the instructions).

Return ONLY valid JSON matching this schema:
{
  "is_valid_problems": boolean,
  "error_message": string | null,
  "selection_rationale": "1-3 sentences explaining why these specific problems were selected/generated to fulfill the prompt.",
  "problems": [
    {
      "problem_statement": "LaTeX problem statement string",
      "solution_guide": "LaTeX solution key steps",
      "problem_type": "multiple_choice",
      "options": ["Distractor A", "Distractor B", "Correct Choice C", "Distractor D"],
      "correct_option_index": 2,
      "difficulty": 2
    }
  ]
}`;

  try {
    const { response } = await generateContentWithFallback(
      ai,
      modelName || 'gemini-3.6-flash',
      [
        {
          role: 'user',
          parts: [{ text: prompt }, ...imageParts],
        },
      ],
      { responseMimeType: 'application/json' }
    );

    const responseText = response.text || '';
    const parsed = JSON.parse(responseText.trim());

    if (!parsed.is_valid_problems) {
      return {
        is_valid_problems: false,
        error_message: parsed.error_message || 'The image does not contain clear problem set exercises.',
        problems: [],
      };
    }

    const rawProblems: ParsedProblemSetItem[] = Array.isArray(parsed.problems) ? parsed.problems : [];
    const problems = rawProblems.map((p) => {
      if (p.problem_type === 'multiple_choice' || (Array.isArray(p.options) && p.options.length >= 2)) {
        return shuffleProblemOptions(p);
      }
      return p;
    });

    return {
      is_valid_problems: true,
      error_message: null,
      selection_rationale: typeof parsed.selection_rationale === 'string' ? parsed.selection_rationale.trim() : null,
      problems,
    };
  } catch (error: any) {
    console.error(`Error parsing problem set with Gemini (${modelName}):`, error);
    return {
      is_valid_problems: false,
      error_message: error.message || 'Failed to digitize problem set image.',
      selection_rationale: null,
      problems: [],
    };
  }
}

export interface QuoteExplanationResult {
  historical_context: string;
  stem_mindset: string;
  learning_strategy: string;
  philosophical_insight: string;
  key_takeaway: string;
}

export async function explainQuoteWithAI(
  quote: string,
  author: string,
  modelName: string = 'gemini-3.6-flash'
): Promise<QuoteExplanationResult> {
  const ai = getGeminiClient();

  const prompt = `You are Sibar's AI Telemetry & Philosophy Coach for high-performance students, mathematicians, scientists, and engineers.
Analyze and contextualize the following motivational quote:

Quote: "${quote}"
Author: "${author}"

Provide a deep, inspiring breakdown that connects this quote directly to STEM study reps, historical context, problem-solving friction, and cognitive mastery. Use clean LaTeX notation ($...$ or $$...$$) where applicable for mathematical examples.

Return ONLY a valid JSON object matching this schema (no markdown fences outside JSON):
{
  "historical_context": "The historical backstory, origin event, or circumstance of what led the author to formulate this quote/thought.",
  "stem_mindset": "How this quote applies directly to mathematics, scientific derivation, engineering problem solving, and embracing friction.",
  "learning_strategy": "Actionable, concrete study reps or habits a student can apply today (e.g., pomodoro focus, error logging, deliberate practice).",
  "philosophical_insight": "Deep underlying wisdom and perspective on growth, resilience, and curiosity.",
  "key_takeaway": "A memorable 1-line motivational mantra for high performers."
}`;

  try {
    const { response } = await generateContentWithFallback(
      ai,
      modelName || 'gemini-3.6-flash',
      [{ role: 'user', parts: [{ text: prompt }] }],
      { responseMimeType: 'application/json' }
    );

    const responseText = response.text || '';
    const parsed = JSON.parse(responseText.trim());

    return {
      historical_context: parsed.historical_context || `${author} expressed this insight based on years of intense intellectual inquiry and problem solving.`,
      stem_mindset: parsed.stem_mindset || 'Apply persistent logical reasoning and stay with mathematical friction until clarity emerges.',
      learning_strategy: parsed.learning_strategy || 'Break complex derivations into smaller sub-problems. Log every mistake in your friction telemetry journal.',
      philosophical_insight: parsed.philosophical_insight || 'Mastery is not an innate gift but the cumulative result of deliberate practice and intellectual curiosity.',
      key_takeaway: parsed.key_takeaway || 'Every solved rep builds permanent cognitive strength.',
    };
  } catch (error: any) {
    console.error(`Error explaining quote with Gemini (${modelName}):`, error);
    throw error;
  }
}

export interface ProblemAdjustmentInput {
  problem_statement: string;
  solution_guide: string;
  problem_type: 'derivation' | 'calculation' | 'multiple_choice' | 'essay';
  options?: string[] | null;
  correct_option_indices?: number[] | null;
  difficulty?: number;
  instruction: string;
}

export interface AdjustedProblemResult {
  problem_statement: string;
  solution_guide: string;
  problem_type: 'derivation' | 'calculation' | 'multiple_choice' | 'essay';
  options: string[] | null;
  correct_option_indices: number[];
  difficulty: number;
  ai_summary?: string;
}

export async function adjustProblemWithAI(
  input: ProblemAdjustmentInput,
  modelName: string = 'gemini-3.6-flash'
): Promise<AdjustedProblemResult> {
  const ai = getGeminiClient();

  const prompt = `You are Sibar's AI STEM Question Refiner and Content Coach.
You are tasked with adjusting, correcting, augmenting, or creating variations for a mathematics or STEM problem based on the user's instructions.

CURRENT PROBLEM STATE:
- Problem Statement:
${input.problem_statement}

- Solution Guide:
${input.solution_guide}

- Problem Type: ${input.problem_type}
- Current Difficulty: ${input.difficulty || 2}/5
${
  input.options && input.options.length > 0
    ? `- Current Options: ${JSON.stringify(input.options)}\n- Correct Option Indices: ${JSON.stringify(input.correct_option_indices || [0])}`
    : ''
}

USER ADJUSTMENT INSTRUCTION:
"${input.instruction}"

CAPABILITIES & FORMAT RULES:
1. Cartesian Function Plot / 2D Graph:
If the user asks to add or adjust a graph/curve (or if a graph improves clarity), include an interactive \`\`\`plot block inside "problem_statement" (or "solution_guide"):
\`\`\`plot
fn: <expression, e.g. x^2 - 4 or sin(x) or 2*x + 1>
range: [<xMin>, <xMax>]
yDomain: [<yMin>, <yMax>]
points: [[x1, y1, "Label 1"], [x2, y2, "Label 2"]]
grid: true
title: <Title>
\`\`\`
2. Diagram / Graph Theory / Flowchart:
If requested, include a \`\`\`mermaid diagram block.
3. LaTeX Math:
Ensure all mathematical variables, formulas, and expressions use standard LaTeX ($...$ inline, $$...$$ display).
4. Multiple Choice Accuracy:
- If "multiple_choice", provide 2 to 5 options (strings with LaTeX or markdown).
- Ensure "correct_option_indices" is an array of 0-based integers matching the exact location of the correct answer(s) (e.g. [0] or [2]).
- Distribute the correct key logically and make distractors plausible based on common student misconceptions.
5. Recalculation:
If numbers or functions are changed, rigorously re-calculate the correct answer and step-by-step solution steps.

Return ONLY a valid JSON object matching this schema (no markdown formatting outside the JSON):
{
  "problem_statement": "Updated problem statement string with LaTeX and optional \`\`\`plot / \`\`\`mermaid blocks",
  "solution_guide": "Updated comprehensive step-by-step derivation / solution key",
  "problem_type": "multiple_choice" | "essay" | "calculation" | "derivation",
  "options": ["Option A", "Option B", "Option C", "Option D"] or null,
  "correct_option_indices": [0],
  "difficulty": integer 1-5,
  "ai_summary": "1-2 sentences explaining what changes were made."
}`;

  try {
    const { response } = await generateContentWithFallback(
      ai,
      modelName || 'gemini-3.6-flash',
      [{ role: 'user', parts: [{ text: prompt }] }],
      { responseMimeType: 'application/json' }
    );

    const responseText = response.text || '';
    const parsed = JSON.parse(responseText.trim());

    return {
      problem_statement: parsed.problem_statement || input.problem_statement,
      solution_guide: parsed.solution_guide || input.solution_guide,
      problem_type: ['multiple_choice', 'essay', 'calculation', 'derivation'].includes(parsed.problem_type)
        ? parsed.problem_type
        : input.problem_type,
      options: Array.isArray(parsed.options) ? parsed.options : null,
      correct_option_indices: Array.isArray(parsed.correct_option_indices) && parsed.correct_option_indices.length > 0
        ? parsed.correct_option_indices
        : [0],
      difficulty: typeof parsed.difficulty === 'number' ? Math.min(5, Math.max(1, parsed.difficulty)) : input.difficulty || 2,
      ai_summary: parsed.ai_summary || 'Applied requested adjustments to question and solution.',
    };
  } catch (error: any) {
    console.error(`Error adjusting problem with AI (${modelName}):`, error);
    throw error;
  }
}
