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

// Helper function to remove a section by class name (handles nested divs properly)
function removeSectionByClass(html, className) {
  const regex = new RegExp(`<div\\s+class="${className}"[^>]*>`, 'gi');
  let result = html;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const startIdx = match.index;
    let depth = 1;
    let endIdx = startIdx + match[0].length;

    // Find the matching closing tag
    while (depth > 0 && endIdx < html.length) {
      const openTag = html.indexOf('<div', endIdx);
      const closeTag = html.indexOf('</div>', endIdx);

      if (closeTag === -1) break;

      if (openTag !== -1 && openTag < closeTag) {
        depth++;
        endIdx = openTag + 4;
      } else {
        depth--;
        endIdx = closeTag + 6;
      }
    }

    // Remove this section
    result = result.substring(0, startIdx) + result.substring(endIdx);
    // Reset regex to search from beginning since we modified the string
    regex.lastIndex = 0;
    html = result;
  }

  return result;
}

// Helper to extract content from HTML
function extractContentFromHTML(html) {
  // Extract title from <title> tag
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  let title = titleMatch ? titleMatch[1].replace(/Day \d+:?\s*/i, '').trim() : '';
  title = title.replace(/\s*\|\s*Market Warrior.*$/i, '').trim();

  // Extract video URL if present (YouTube embed)
  const videoMatch = html.match(/src="(https:\/\/www\.youtube\.com\/embed\/[^"]+)"/i);
  const videoUrl = videoMatch ? videoMatch[1] : null;

  // Extract the content inside <div class="container">
  let lessonContent = '';
  const containerMatch = html.match(/<div class="container">([\s\S]*?)<script/i);

  if (containerMatch) {
    lessonContent = containerMatch[1];

    // Remove sections that are rendered by the day page component
    lessonContent = removeSectionByClass(lessonContent, 'day-header');
    lessonContent = removeSectionByClass(lessonContent, 'video-placeholder');
    lessonContent = removeSectionByClass(lessonContent, 'task-section');
    lessonContent = removeSectionByClass(lessonContent, 'quiz-container');
    lessonContent = removeSectionByClass(lessonContent, 'sneak-peek');
    lessonContent = removeSectionByClass(lessonContent, 'completion-section');

    // Remove the video section (section containing only video placeholder)
    lessonContent = lessonContent.replace(/<div class="section">\s*<h2>[^<]*Video[^<]*<\/h2>\s*<\/div>/gi, '');

    // Remove HTML comments
    lessonContent = lessonContent.replace(/<!--[\s\S]*?-->/g, '');

    // Remove empty section wrappers
    lessonContent = lessonContent.replace(/<div class="section">\s*<\/div>/gi, '');

    // Clean up multiple blank lines
    lessonContent = lessonContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
  }

  // Extract task prompt as HTML (to preserve styling)
  let taskPrompt = '';
  const taskSectionMatch = html.match(/<div class="task-section"[^>]*>([\s\S]*?)<div class="submission-form"/i);
  if (taskSectionMatch) {
    // Get the task description part (mission, etc)
    const missionMatch = taskSectionMatch[1].match(/<h3>Your Mission:?<\/h3>([\s\S]*?)$/i);
    if (missionMatch) {
      // Keep as HTML for styling
      taskPrompt = missionMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  // Fallback: extract task as text
  if (!taskPrompt) {
    const altTaskMatch = html.match(/Your Mission:?([\s\S]*?)(?=<div class="submission|<textarea)/i);
    if (altTaskMatch) {
      taskPrompt = altTaskMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500);
    }
  }

  // Extract quiz questions using a simpler, more robust approach
  const quizQuestions = [];

  // Find all question-container divs with data-question attribute
  const questionStartRegex = /<div\s+class="question-container[^"]*"[^>]*data-question="(\d+)"[^>]*>/gi;
  let qStartMatch;
  const questionPositions = [];

  while ((qStartMatch = questionStartRegex.exec(html)) !== null) {
    questionPositions.push({
      questionNum: parseInt(qStartMatch[1]),
      startIdx: qStartMatch.index,
      tagEndIdx: qStartMatch.index + qStartMatch[0].length
    });
  }

  // For each question, extract its content using nested div counting
  for (const qPos of questionPositions) {
    let depth = 1;
    let endIdx = qPos.tagEndIdx;

    while (depth > 0 && endIdx < html.length) {
      const openTag = html.indexOf('<div', endIdx);
      const closeTag = html.indexOf('</div>', endIdx);

      if (closeTag === -1) break;

      if (openTag !== -1 && openTag < closeTag) {
        depth++;
        endIdx = openTag + 4;
      } else {
        depth--;
        endIdx = closeTag + 6;
      }
    }

    const questionHtml = html.substring(qPos.tagEndIdx, endIdx - 6);

    // Extract question text
    const qTextMatch = questionHtml.match(/<div class="question-text">([^<]+)<\/div>/i);
    const questionText = qTextMatch ? qTextMatch[1].trim() : '';

    // Extract options - find all quiz-option spans
    const options = [];
    const optionRegex = /<div class="quiz-option"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/gi;
    let optMatch;
    while ((optMatch = optionRegex.exec(questionHtml)) !== null) {
      options.push(optMatch[1].trim());
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
