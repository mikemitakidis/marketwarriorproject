import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';
import fs from 'fs';
import path from 'path';

// Official day titles
const DAY_TITLES = {
  1: 'Introduction to Trading and Types of Financial Markets',
  2: 'Setting Up a Virtual/Demo Account',
  3: 'Essential Trading Terms & Order Types',
  4: 'Investment vs Trading - Understanding the Difference',
  5: 'Market Indexes',
  6: 'Stop Loss, Take Profit, Leverage & Margin',
  7: 'Reading Price Charts & Candlestick Basics',
  8: 'Trend Lines & Chart Patterns',
  9: 'Moving Averages & Support/Resistance',
  10: 'Chart Patterns',
  11: 'Key Indicators - RSI, MACD, MAs & Economic Cycle',
  12: 'Introduction to Fundamental Analysis',
  13: 'Stock Research & Key Financial Ratios',
  14: 'Simulated Trading Exercise',
  15: 'Risk Management & Position Sizing',
  16: 'Moving Averages & Crossovers Strategy',
  17: 'Fibonacci Retracements & Advanced Chart Analysis',
  18: 'Backtesting Strategies & Chart Review',
  19: 'Creating a Trading Plan & ROI',
  20: 'Trading Psychology – Emotional Mastery',
  21: 'Dividends, Bonds & Fixed Income Assets',
  22: 'IPOs, Penny Stocks, Crypto & Market Volatility',
  23: 'Hedge Funds & Copy Trading',
  24: 'Portfolio Rebalancing Basics',
  25: 'Monitoring Virtual Portfolio Performance',
  26: 'Adjusting Your Strategy Based on Results',
  27: 'Trade Journaling & Performance Tracking',
  28: 'Global Economic Indicators',
  29: 'SMART Goals Setting & Review',
  30: 'Final Assessment & Graduation',
};

/**
 * API route: /api/admin/import-content
 *
 * Admin-only endpoint to import day content from HTML templates.
 * POST body: { day?: number } - Import specific day or all days if not specified
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminUser = await getUserFromRequest(req);
    if (!adminUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const supabase = getServiceSupabase();

    // Check if current user is admin
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', adminUser.id)
      .single();

    if (!adminProfile?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { day } = req.body;
    const results = [];

    const startDay = day ? parseInt(day) : 1;
    const endDay = day ? parseInt(day) : 30;

    for (let dayNum = startDay; dayNum <= endDay; dayNum++) {
      const result = await importDay(supabase, dayNum);
      results.push(result);
    }

    return res.status(200).json({
      success: true,
      message: `Imported ${results.filter(r => r.success).length} days`,
      results,
    });

  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ error: err.message || 'Import failed' });
  }
}

function findDayFile(templatesDir, dayNum) {
  // Try exact match first
  const exactPath = path.join(templatesDir, `day${dayNum}.html`);
  if (fs.existsSync(exactPath)) {
    return exactPath;
  }

  // Try pattern with suffix (e.g., day15_risk_management.html)
  const files = fs.readdirSync(templatesDir);
  const pattern = new RegExp(`^day${dayNum}[_.]`);
  const matchingFile = files.find(f => pattern.test(f) && f.endsWith('.html'));

  if (matchingFile) {
    return path.join(templatesDir, matchingFile);
  }

  return null;
}

async function importDay(supabase, dayNum) {
  const templatesDir = path.join(process.cwd(), 'templates/days/market_warrior_days_content');
  const filePath = findDayFile(templatesDir, dayNum);

  if (!filePath) {
    return { day: dayNum, success: false, error: 'File not found' };
  }

  try {
    const html = fs.readFileSync(filePath, 'utf-8');

    // Use official titles from DAY_TITLES mapping
    const title = DAY_TITLES[dayNum] || extractTitle(html) || `Day ${dayNum} Lesson`;
    const content = extractMainContent(html);
    const taskPrompt = extractTaskPrompt(html);
    const quizQuestions = extractQuizQuestions(html, dayNum);

    // Upsert course_content
    const { error: contentError } = await supabase
      .from('course_content')
      .upsert({
        day: dayNum,
        title,
        html_content: content,
        video_url: null,
        task_prompt: taskPrompt,
      }, { onConflict: 'day' });

    if (contentError) {
      return { day: dayNum, success: false, error: contentError.message };
    }

    // Delete existing quiz questions and insert new ones
    if (quizQuestions.length > 0) {
      await supabase.from('quiz_questions').delete().eq('day', dayNum);

      const { error: quizError } = await supabase
        .from('quiz_questions')
        .insert(quizQuestions);

      if (quizError) {
        return { day: dayNum, success: true, title, quizError: quizError.message, quizCount: 0 };
      }
    }

    return {
      day: dayNum,
      success: true,
      title,
      quizCount: quizQuestions.length,
    };

  } catch (err) {
    return { day: dayNum, success: false, error: err.message };
  }
}

function extractTitle(html) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  if (match) {
    return match[1].replace(/^Day\s+\d+:\s*/i, '').trim();
  }
  return null;
}

function extractMainContent(html) {
  // Extract the body content between <body> and the quiz/task sections
  const bodyMatch = html.match(/<body>([\s\S]*?)<div class="quiz-container"/i);
  if (bodyMatch) {
    let content = bodyMatch[1];
    // Remove task-section
    content = content.replace(/<div class="task-section"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi, '');
    // Remove script tags
    content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
    // Clean up excess whitespace
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    return content.trim();
  }

  // Fallback - get everything inside container
  const containerMatch = html.match(/<div class="container">([\s\S]*?)<div class="quiz-container"/i);
  if (containerMatch) {
    return containerMatch[1].trim();
  }

  return '<p>Content coming soon.</p>';
}

function extractTaskPrompt(html) {
  // Look for the mission/task description
  const missionMatch = html.match(/<h3>Your Mission:<\/h3>\s*([\s\S]*?)(?:<div style="|<textarea)/i);
  if (missionMatch) {
    let text = missionMatch[1]
      .replace(/<\/?ol>/gi, '')
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/?strong>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return text;
  }

  // Fallback task prompt
  return 'Complete the daily task and submit your response.';
}

function extractQuizQuestions(html, dayNum) {
  const questions = [];

  // Find correct answers from JavaScript
  const answersMatch = html.match(/let\s+correctAnswers\s*=\s*\[([^\]]+)\]/);
  let correctAnswers = [];
  if (answersMatch) {
    correctAnswers = answersMatch[1]
      .split(',')
      .map(a => a.trim().replace(/['"]/g, ''));
  }

  // Find quizQuestions array for explanations (if available)
  const quizDataMatch = html.match(/const\s+quizQuestions\s*=\s*\[([\s\S]*?)\];/);

  // Find each question in the HTML
  const questionBlocks = html.matchAll(/<div class="question-container"[^>]*data-question="(\d+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*(?=<div class="question-container"|<\/div>\s*<div class="quiz-navigation")/gi);

  for (const match of questionBlocks) {
    const questionNum = parseInt(match[1]);
    const questionHtml = match[2];

    // Extract question text
    const questionTextMatch = questionHtml.match(/<div class="question-text">([^<]+)<\/div>/);
    const questionText = questionTextMatch ? questionTextMatch[1].trim() : '';

    // Extract options
    const options = [];
    const optionMatches = questionHtml.matchAll(/<div class="quiz-option"[^>]*data-answer="([a-d])"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/gi);
    for (const optMatch of optionMatches) {
      options.push(optMatch[2].trim());
    }

    // Get correct answer index
    const correctLetter = correctAnswers[questionNum - 1] || 'a';
    const correctIndex = correctLetter.charCodeAt(0) - 'a'.charCodeAt(0);

    if (questionText && options.length >= 2) {
      questions.push({
        day: dayNum,
        question: questionText,
        options: options,
        correct_option: correctIndex,
      });
    }
  }

  return questions;
}
