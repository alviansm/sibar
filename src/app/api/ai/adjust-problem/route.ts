import { NextRequest, NextResponse } from 'next/server';
import { adjustProblemWithAI, ProblemAdjustmentInput } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentProblem, instruction, modelName } = body;

    if (!instruction || !instruction.trim()) {
      return NextResponse.json({ error: 'Adjustment instruction is required' }, { status: 400 });
    }

    if (!currentProblem || !currentProblem.problem_statement) {
      return NextResponse.json({ error: 'Current problem data is required' }, { status: 400 });
    }

    const input: ProblemAdjustmentInput = {
      problem_statement: currentProblem.problem_statement || '',
      solution_guide: currentProblem.solution_guide || '',
      problem_type: currentProblem.problem_type || 'multiple_choice',
      options: currentProblem.options || null,
      correct_option_indices: currentProblem.correct_option_indices || null,
      difficulty: currentProblem.difficulty || 2,
      instruction: instruction.trim(),
    };

    const result = await adjustProblemWithAI(input, modelName || 'gemini-3.6-flash');

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error adjusting problem with AI:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to adjust problem with AI' },
      { status: 500 }
    );
  }
}
