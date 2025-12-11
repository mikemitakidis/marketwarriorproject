// Quiz Submission API
// Route: /api/quiz/submit

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  VercelRequest,
  VercelResponse,
  QuizSubmitRequestBody,
  QuizSubmitSuccessResponse,
  QuizSubmitErrorResponse,
} from '../../types';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gvpaendpmwyncdztlczy.supabase.co';
const PASSING_THRESHOLD_MESSAGE = 'Quiz not passed. You need 60% to continue.';
const PASSING_SUCCESS_MESSAGE = 'Quiz passed! You can now submit your task.';

interface QuizUpsertData {
  user_id: string;
  day_number: number;
  score: number;
  passed: boolean;
  answers: number[];
  completed_at: string;
}

interface ProgressUpsertData {
  user_id: string;
  day_number: number;
  quiz_passed: boolean;
  quiz_score: number;
  unlocked: boolean;
}

function isValidRequestBody(body: unknown): body is QuizSubmitRequestBody {
  return typeof body === 'object' && body !== null;
}

function getSupabaseKey(): string {
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error('Supabase key not configured');
  }
  return key;
}

function createSupabaseClient(): SupabaseClient {
  return createClient(SUPABASE_URL, getSupabaseKey());
}

async function saveQuizResult(
  supabase: SupabaseClient,
  data: QuizUpsertData
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('quiz_results')
    .upsert(data, { onConflict: 'user_id,day_number' });

  return { error: error as Error | null };
}

async function updateProgress(
  supabase: SupabaseClient,
  data: ProgressUpsertData
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('progress')
    .upsert(data, { onConflict: 'user_id,day_number' });

  return { error: error as Error | null };
}

function createSuccessResponse(score: number, passed: boolean): QuizSubmitSuccessResponse {
  return {
    success: true,
    score,
    passed,
    message: passed ? PASSING_SUCCESS_MESSAGE : PASSING_THRESHOLD_MESSAGE,
  };
}

function createErrorResponse(error: string): QuizSubmitErrorResponse {
  return { error };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json(createErrorResponse('Method not allowed'));
    return;
  }

  try {
    if (!isValidRequestBody(req.body)) {
      res.status(400).json(createErrorResponse('Invalid request body'));
      return;
    }

    const { userId, dayNumber, answers, score, passed } = req.body as QuizSubmitRequestBody;

    if (!userId || dayNumber === undefined || dayNumber === null) {
      res.status(400).json(createErrorResponse('Missing required fields'));
      return;
    }

    const supabase = createSupabaseClient();

    // Save quiz result
    const quizData: QuizUpsertData = {
      user_id: userId,
      day_number: dayNumber,
      score: score ?? 0,
      passed: passed ?? false,
      answers: answers ?? [],
      completed_at: new Date().toISOString(),
    };

    const { error: quizError } = await saveQuizResult(supabase, quizData);

    if (quizError) {
      console.error('Quiz save error:', quizError);
      res.status(500).json(createErrorResponse('Failed to save quiz result'));
      return;
    }

    // Update progress
    const progressData: ProgressUpsertData = {
      user_id: userId,
      day_number: dayNumber,
      quiz_passed: passed ?? false,
      quiz_score: score ?? 0,
      unlocked: true,
    };

    const { error: progressError } = await updateProgress(supabase, progressData);

    if (progressError) {
      console.error('Progress update error:', progressError);
      // Don't return error - quiz was saved successfully
    }

    res.status(200).json(createSuccessResponse(score ?? 0, passed ?? false));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Quiz submission error:', errorMessage);
    res.status(500).json(createErrorResponse('Server error'));
  }
}

module.exports = handler;
