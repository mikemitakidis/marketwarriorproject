/**
 * Script to import day content from HTML templates into Supabase database.
 *
 * Run with: node scripts/import-day-content.js
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TEMPLATES_DIR = path.join(__dirname, '../templates/days/market_warrior_days_content');

/**
 * Extract title from HTML
 */
function extractTitle(html) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  if (match) {
    // Remove "Day X: " prefix if present
    return match[1].replace(/^Day\s+\d+:\s*/i, '').trim();
  }
  return null;
}

/**
 * Extract lesson content HTML (everything between sections, excluding quiz and task)
 */
function extractLessonContent(html) {
  // Extract all sections with class="section" that are NOT quiz or task sections
  const sections = [];
  const sectionRegex = /<div class="section"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="|<\/div>\s*<script)/gi;

  let match;
  while ((match = sectionRegex.exec(html)) !== null) {
    const content = match[0];
    // Skip quiz and task sections
    if (!content.includes('quiz-container') && !content.includes('task-section')) {
      sections.push(content);
    }
  }

  // Also extract market-visual, why-popular, and other special sections
  const specialSections = [
    /<div class="market-visual"[\s\S]*?<\/div>\s*<\/div>/gi,
    /<div class="why-popular"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi,
    /<div class="sneak-peek"[\s\S]*?<\/div>/gi,
  ];

  // Combine into a single HTML string
  return sections.join('\n\n');
}

/**
 * Extract quiz questions from HTML
 */
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

  // Find question containers
  const questionRegex = /<div class="question-container"[^>]*data-question="(\d+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;

  let match;
  while ((match = questionRegex.exec(html)) !== null) {
    const questionNum = parseInt(match[1]);
    const questionHtml = match[2];

    // Extract question text
    const questionTextMatch = questionHtml.match(/<div class="question-text">([^<]+)<\/div>/);
    const questionText = questionTextMatch ? questionTextMatch[1].trim() : '';

    // Extract options
    const options = [];
    const optionRegex = /<div class="quiz-option"[^>]*data-answer="([a-d])"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/gi;
    let optMatch;
    while ((optMatch = optionRegex.exec(questionHtml)) !== null) {
      options.push(optMatch[2].trim());
    }

    // Get correct answer index (a=0, b=1, c=2, d=3)
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

/**
 * Extract task prompt from HTML
 */
function extractTaskPrompt(html) {
  // Look for task section content
  const taskMatch = html.match(/<div class="task-section"[\s\S]*?<h3>Your Mission:<\/h3>([\s\S]*?)<div style="background:/);
  if (taskMatch) {
    // Clean up HTML to get text
    let taskText = taskMatch[1]
      .replace(/<\/?ol>/gi, '')
      .replace(/<li>/gi, '\n• ')
      .replace(/<\/li>/gi, '')
      .replace(/<\/?strong>/gi, '')
      .replace(/<\/?p>/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    return taskText;
  }

  // Fallback - look for any task description
  const fallbackMatch = html.match(/<h2>[^<]*Task[^<]*<\/h2>([\s\S]*?)<textarea/i);
  if (fallbackMatch) {
    return fallbackMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500);
  }

  return 'Complete the daily task and submit your response.';
}

/**
 * Process a single day file
 */
async function processDayFile(dayNum) {
  const filePath = path.join(TEMPLATES_DIR, `day${dayNum}.html`);

  if (!fs.existsSync(filePath)) {
    console.log(`  Day ${dayNum}: File not found, skipping`);
    return null;
  }

  const html = fs.readFileSync(filePath, 'utf-8');

  const title = extractTitle(html) || `Day ${dayNum} Lesson`;
  const content = extractLessonContent(html);
  const taskPrompt = extractTaskPrompt(html);
  const quizQuestions = extractQuizQuestions(html, dayNum);

  return {
    day: dayNum,
    title,
    html_content: content || '<p>Content coming soon.</p>',
    video_url: null, // Will be set via admin panel
    task_prompt: taskPrompt,
    quiz_questions: quizQuestions,
  };
}

/**
 * Import all days into database
 */
async function importAllDays() {
  console.log('Starting import of day content...\n');

  for (let dayNum = 1; dayNum <= 30; dayNum++) {
    console.log(`Processing Day ${dayNum}...`);

    const dayData = await processDayFile(dayNum);

    if (!dayData) continue;

    // Insert/update course_content
    const { error: contentError } = await supabase
      .from('course_content')
      .upsert({
        day: dayData.day,
        title: dayData.title,
        html_content: dayData.html_content,
        video_url: dayData.video_url,
        task_prompt: dayData.task_prompt,
      }, { onConflict: 'day' });

    if (contentError) {
      console.error(`  Error inserting content for day ${dayNum}:`, contentError.message);
    } else {
      console.log(`  ✓ Content inserted for Day ${dayNum}: "${dayData.title}"`);
    }

    // Insert quiz questions
    if (dayData.quiz_questions.length > 0) {
      // First delete existing questions for this day
      await supabase
        .from('quiz_questions')
        .delete()
        .eq('day', dayNum);

      // Insert new questions
      const { error: quizError } = await supabase
        .from('quiz_questions')
        .insert(dayData.quiz_questions);

      if (quizError) {
        console.error(`  Error inserting quiz for day ${dayNum}:`, quizError.message);
      } else {
        console.log(`  ✓ ${dayData.quiz_questions.length} quiz questions inserted for Day ${dayNum}`);
      }
    }
  }

  console.log('\n✅ Import complete!');
}

// Run the import
importAllDays().catch(console.error);
