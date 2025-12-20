import { getServiceSupabase, getUserFromRequest } from '../../../lib/serverAuth';
import fs from 'fs';
import path from 'path';

/**
 * API route: /api/admin/seed-content
 *
 * Seeds all 30 days of content from HTML files into the database.
 * Only accessible by admins.
 *
 * POST: Seed all content
 * GET: Check current content status
 */

// Helper to extract content from HTML
function extractContentFromHTML(html) {
  // Extract title from <title> tag
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  let title = titleMatch ? titleMatch[1].replace(/Day \d+:?\s*/i, '').trim() : '';

  // Clean up title
  title = title.replace(/\s*\|\s*Market Warrior.*$/i, '').trim();

  // Extract video URL if present (YouTube embed)
  const videoMatch = html.match(/src="(https:\/\/www\.youtube\.com\/embed\/[^"]+)"/i);
  const videoUrl = videoMatch ? videoMatch[1] : null;

  // Extract main lesson content (between sections)
  // Look for content between video section and quiz/task section
  let lessonContent = '';

  // Find all section divs with lesson content
  const sectionRegex = /<div class="section"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="section"|<div class="quiz|<div class="task|<\/div>\s*<script)/gi;
  let match;
  const sections = [];

  while ((match = sectionRegex.exec(html)) !== null) {
    const sectionContent = match[1];
    // Skip video-only sections and quiz sections
    if (!sectionContent.includes('video-placeholder') || sectionContent.includes('<h2>')) {
      // Clean up the section content
      let cleaned = sectionContent
        .replace(/<div class="video-placeholder">[\s\S]*?<\/div>/gi, '') // Remove video placeholders
        .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
        .trim();

      if (cleaned.length > 100) { // Only add substantial sections
        sections.push(cleaned);
      }
    }
  }

  lessonContent = sections.join('\n\n');

  // If no sections found, try to get content another way
  if (!lessonContent) {
    // Get content between container div and quiz-container
    const containerMatch = html.match(/<div class="container">([\s\S]*?)<div class="quiz-container"/i);
    if (containerMatch) {
      lessonContent = containerMatch[1]
        .replace(/<div class="day-header">[\s\S]*?<\/div>\s*<\/div>/gi, '')
        .replace(/<div class="video-placeholder">[\s\S]*?<\/div>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .trim();
    }
  }

  // Extract task prompt
  let taskPrompt = '';
  const taskMatch = html.match(/<div class="task-section"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="quiz|<div class="section|<\/div>\s*<div class="quiz)/i);
  if (taskMatch) {
    // Get the task description
    const taskContent = taskMatch[1];
    const missionMatch = taskContent.match(/<h3>Your Mission:?<\/h3>([\s\S]*?)(?=<div|<textarea|$)/i);
    if (missionMatch) {
      taskPrompt = missionMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  // If no task prompt found, try alternate pattern
  if (!taskPrompt) {
    const altTaskMatch = html.match(/Day \d+ Task[\s\S]*?Your Mission:?([\s\S]*?)(?=<textarea|<div class="quiz|$)/i);
    if (altTaskMatch) {
      taskPrompt = altTaskMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500); // Limit length
    }
  }

  // Extract quiz questions
  const quizQuestions = [];
  const questionRegex = /<div class="question-container"[^>]*data-question="(\d+)"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="question-container"|<\/div>\s*<div class="quiz-navigation")/gi;

  let qMatch;
  while ((qMatch = questionRegex.exec(html)) !== null) {
    const questionNum = parseInt(qMatch[1]);
    const questionHtml = qMatch[2];

    // Extract question text
    const qTextMatch = questionHtml.match(/<div class="question-text">([^<]+)<\/div>/i);
    const questionText = qTextMatch ? qTextMatch[1].trim() : '';

    // Extract options
    const options = [];
    const optionRegex = /<div class="quiz-option"[^>]*data-answer="([^"]+)"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/gi;
    let optMatch;
    while ((optMatch = optionRegex.exec(questionHtml)) !== null) {
      options.push(optMatch[2].trim());
    }

    if (questionText && options.length > 0) {
      quizQuestions.push({
        question: questionText,
        options: options,
      });
    }
  }

  // Extract correct answers from JavaScript
  const answersMatch = html.match(/correctAnswers\s*[:=]\s*\[([^\]]+)\]/i);
  let correctAnswers = [];
  if (answersMatch) {
    correctAnswers = answersMatch[1]
      .split(',')
      .map(a => {
        const letter = a.trim().replace(/['"]/g, '').toLowerCase();
        return 'abcd'.indexOf(letter);
      })
      .filter(i => i >= 0);
  }

  // Also check for object-style answers (Day 30 format)
  if (correctAnswers.length === 0) {
    const objAnswersMatch = html.match(/correctAnswers\s*[:=]\s*\{([^}]+)\}/i);
    if (objAnswersMatch) {
      const answerPairs = objAnswersMatch[1].match(/\d+:\s*['"]([a-d])['"]/gi);
      if (answerPairs) {
        correctAnswers = answerPairs.map(pair => {
          const letter = pair.match(/['"]([a-d])['"]/i)?.[1]?.toLowerCase();
          return letter ? 'abcd'.indexOf(letter) : -1;
        }).filter(i => i >= 0);
      }
    }
  }

  // Assign correct answers to questions
  quizQuestions.forEach((q, idx) => {
    q.correctOption = correctAnswers[idx] !== undefined ? correctAnswers[idx] : 0;
  });

  return {
    title,
    videoUrl,
    lessonContent,
    taskPrompt,
    quizQuestions,
  };
}

export default async function handler(req, res) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const supabase = getServiceSupabase();

    // Check if admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.method === 'GET') {
      // Return current content status
      const { data: content } = await supabase
        .from('course_content')
        .select('day, title')
        .order('day');

      const { data: quizCounts } = await supabase
        .from('quiz_questions')
        .select('day');

      const quizByDay = {};
      (quizCounts || []).forEach(q => {
        quizByDay[q.day] = (quizByDay[q.day] || 0) + 1;
      });

      return res.status(200).json({
        daysWithContent: content?.length || 0,
        content: content || [],
        quizQuestionsByDay: quizByDay,
      });
    }

    if (req.method === 'POST') {
      const { daysToSeed } = req.body; // Optional: specific days to seed

      // Path to HTML files
      const htmlDir = path.join(process.cwd(), 'templates/days/market_warrior_days_content');

      // Check if directory exists
      if (!fs.existsSync(htmlDir)) {
        return res.status(404).json({
          error: 'HTML content directory not found',
          path: htmlDir
        });
      }

      // Get all HTML files
      const files = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html'));

      const results = {
        seeded: [],
        errors: [],
        skipped: [],
      };

      for (const file of files) {
        try {
          // Extract day number from filename
          const dayMatch = file.match(/day(\d+)/i);
          if (!dayMatch) {
            results.skipped.push({ file, reason: 'Could not extract day number' });
            continue;
          }

          const dayNum = parseInt(dayMatch[1]);

          // Skip if not in daysToSeed (when specified)
          if (daysToSeed && !daysToSeed.includes(dayNum)) {
            results.skipped.push({ file, reason: 'Not in daysToSeed list' });
            continue;
          }

          // Read and parse HTML file
          const htmlPath = path.join(htmlDir, file);
          const html = fs.readFileSync(htmlPath, 'utf-8');
          const extracted = extractContentFromHTML(html);

          // Upsert course content
          const { error: contentError } = await supabase
            .from('course_content')
            .upsert({
              day: dayNum,
              title: extracted.title || `Day ${dayNum} Lesson`,
              html_content: extracted.lessonContent || '',
              video_url: extracted.videoUrl,
              task_prompt: extracted.taskPrompt || '',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'day' });

          if (contentError) {
            results.errors.push({ day: dayNum, error: contentError.message, type: 'content' });
            continue;
          }

          // Delete existing quiz questions for this day
          await supabase
            .from('quiz_questions')
            .delete()
            .eq('day', dayNum);

          // Insert new quiz questions
          if (extracted.quizQuestions.length > 0) {
            const quizData = extracted.quizQuestions.map((q, idx) => ({
              day: dayNum,
              question: q.question,
              options: q.options,
              correct_option: q.correctOption,
              order_num: idx + 1,
            }));

            const { error: quizError } = await supabase
              .from('quiz_questions')
              .insert(quizData);

            if (quizError) {
              results.errors.push({ day: dayNum, error: quizError.message, type: 'quiz' });
            }
          }

          results.seeded.push({
            day: dayNum,
            title: extracted.title,
            quizQuestions: extracted.quizQuestions.length,
            hasVideo: !!extracted.videoUrl,
            hasTask: !!extracted.taskPrompt,
          });

        } catch (fileError) {
          results.errors.push({ file, error: fileError.message });
        }
      }

      // Sort results by day
      results.seeded.sort((a, b) => a.day - b.day);

      return res.status(200).json({
        success: true,
        message: `Seeded ${results.seeded.length} days`,
        results,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Seed content error:', err);
    return res.status(500).json({ error: err.message });
  }
}
