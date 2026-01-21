import { getServiceSupabase, getUserFromRequest } , verifyAdminAccess } from '../../../lib/serverAuth';
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
    lessonContent = removeSectionByClass(lessonContent, 'quiz-results');
    lessonContent = removeSectionByClass(lessonContent, 'sneak-peek');
    lessonContent = removeSectionByClass(lessonContent, 'completion-section');

    // Remove quiz-related elements by ID
    lessonContent = lessonContent.replace(/<div[^>]*id="quizResults"[^>]*>[\s\S]*?<\/div>/gi, '');
    lessonContent = lessonContent.replace(/<div[^>]*id="quizContent"[^>]*>[\s\S]*?<\/div>/gi, '');
    lessonContent = lessonContent.replace(/<div[^>]*id="quizReview"[^>]*>[\s\S]*?<\/div>/gi, '');

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

  // Extract quiz questions - only from HTML body, not JavaScript
  const quizQuestions = [];

  // Get the HTML portion - find the script that contains quiz logic (correctAnswers)
  // Some files have decorative scripts (confetti, animations) before the main quiz content
  let htmlBody = html;
  const scriptMatches = [...html.matchAll(/<script[^>]*>/gi)];
  if (scriptMatches.length > 0) {
    // Find which script contains correctAnswers (quiz logic)
    let quizScriptPos = -1;
    for (const match of scriptMatches) {
      const scriptStart = match.index;
      const scriptContent = html.substring(scriptStart, scriptStart + 5000);
      if (scriptContent.includes('correctAnswers')) {
        quizScriptPos = scriptStart;
        break;
      }
    }
    // If found, use everything before that script as htmlBody
    if (quizScriptPos > 0) {
      htmlBody = html.substring(0, quizScriptPos);
    } else {
      // Fallback: use everything before the last script
      const lastScript = scriptMatches[scriptMatches.length - 1];
      htmlBody = html.substring(0, lastScript.index);
    }
  }

  // ========== FORMAT 1: Standard format (question-container with quiz-option spans) ==========
  const questionStartRegex = /<div[^>]*class="question-container[^"]*"[^>]*data-question="(\d+)"[^>]*>/gi;
  let qStartMatch;
  const questionPositions = [];

  while ((qStartMatch = questionStartRegex.exec(htmlBody)) !== null) {
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

    while (depth > 0 && endIdx < htmlBody.length) {
      const openTag = htmlBody.indexOf('<div', endIdx);
      const closeTag = htmlBody.indexOf('</div>', endIdx);

      if (closeTag === -1) break;

      if (openTag !== -1 && openTag < closeTag) {
        depth++;
        endIdx = openTag + 4;
      } else {
        depth--;
        endIdx = closeTag + 6;
      }
    }

    const questionHtml = htmlBody.substring(qPos.tagEndIdx, endIdx - 6);

    // Extract question text (may span multiple lines, with or without question-text class)
    let qTextMatch = questionHtml.match(/<div class="question-text"[^>]*>([\s\S]*?)<\/div>/i);
    // Fallback: question text in div with just style (Day 24 format)
    if (!qTextMatch) {
      qTextMatch = questionHtml.match(/<div[^>]*style="[^"]*font-size[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    }
    let questionText = qTextMatch ? qTextMatch[1].trim() : '';
    // Remove HTML tags like <strong>
    questionText = questionText.replace(/<[^>]+>/g, '');
    // Remove numbered prefix like "1. " at the start
    questionText = questionText.replace(/^\d+\.\s*/, '').trim();

    // Extract options - try multiple formats
    const options = [];

    // Format 1a: quiz-option with span (Days 1-26, 28-29)
    const optionWithSpanRegex = /<div class="quiz-option"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/gi;
    let optMatch;
    while ((optMatch = optionWithSpanRegex.exec(questionHtml)) !== null) {
      options.push(optMatch[1].trim());
    }

    // Format 1b: quiz-option with plain text like "A) Option text" (Day 30)
    if (options.length === 0) {
      const optionPlainRegex = /<div class="quiz-option"[^>]*>([A-D]\)?\s*[^<]+)<\/div>/gi;
      while ((optMatch = optionPlainRegex.exec(questionHtml)) !== null) {
        // Remove the "A) " prefix
        let optText = optMatch[1].trim();
        optText = optText.replace(/^[A-D]\)\s*/, '');
        options.push(optText);
      }
    }

    // Format 1c: quiz-option with span.option-letter for letter, then text (Day 24)
    // e.g., <div class="quiz-option"><span class="option-letter">A)</span> Option text</div>
    if (options.length === 0) {
      const optionLetterSpanRegex = /<div class="quiz-option"[^>]*>\s*<span[^>]*class="option-letter"[^>]*>[^<]*<\/span>\s*([^<]+)/gi;
      while ((optMatch = optionLetterSpanRegex.exec(questionHtml)) !== null) {
        options.push(optMatch[1].trim());
      }
    }

    if (questionText && options.length > 0) {
      quizQuestions.push({
        question: questionText,
        options: options,
      });
    }
  }

  // ========== FORMAT 2: Day 27 format (quiz-section with onclick handlers) ==========
  if (quizQuestions.length === 0) {
    // Look for quiz-section format
    const quizSectionMatch = htmlBody.match(/<div class="quiz-section">([\s\S]*?)(?:<div class="task-section|<div class="completion-section|$)/i);
    if (quizSectionMatch) {
      const quizSectionHtml = quizSectionMatch[1];

      // Find all questions with h4 tags
      const questionRegex = /<div class="question">\s*<h4>(\d+)\.\s*([^<]+)<\/h4>\s*<div class="options">([\s\S]*?)<\/div>\s*<\/div>/gi;
      let qMatch;

      while ((qMatch = questionRegex.exec(quizSectionHtml)) !== null) {
        const questionText = qMatch[2].trim();
        const optionsHtml = qMatch[3];

        // Extract options with their onclick handlers to determine correct answer
        const options = [];
        let correctIdx = 0;

        const optRegex = /<div class="option"[^>]*onclick="selectAnswer\(this,\s*'q\d+',\s*(true|false)\)"[^>]*>([^<]+)<\/div>/gi;
        let oMatch;
        let optIdx = 0;

        while ((oMatch = optRegex.exec(optionsHtml)) !== null) {
          const isCorrect = oMatch[1].toLowerCase() === 'true';
          let optText = oMatch[2].trim();
          // Remove "A) " prefix
          optText = optText.replace(/^[A-D]\)\s*/, '');
          options.push(optText);

          if (isCorrect) {
            correctIdx = optIdx;
          }
          optIdx++;
        }

        if (questionText && options.length > 0) {
          quizQuestions.push({
            question: questionText,
            options: options,
            correctOption: correctIdx,
          });
        }
      }
    }
  }

  // Extract correct answers from JavaScript (for formats that store answers separately)
  let correctAnswers = [];

  // Check if questions already have correctOption set (Format 2)
  const needsAnswers = quizQuestions.length > 0 && quizQuestions[0].correctOption === undefined;

  if (needsAnswers) {
    // Array format: correctAnswers = ['b', 'c', 'b']
    const answersMatch = html.match(/correctAnswers\s*[:=]\s*\[([^\]]+)\]/i);
    if (answersMatch) {
      correctAnswers = answersMatch[1]
        .split(',')
        .map(a => {
          const letter = a.trim().replace(/['"]/g, '').toLowerCase();
          return 'abcd'.indexOf(letter);
        })
        .filter(i => i >= 0);
    }

    // Object format: correctAnswers = {1: 'b', 2: 'c'}
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
  }

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
    // SECURITY: Verify admin authorization (checks is_admin + email allowlist)
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const isAdmin = await verifyAdminAccess(user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const supabase = getServiceSupabase();

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
            // Convert options array to object format {"A":"..","B":"..","C":"..","D":".."}
            // Convert correct answer index (0,1,2,3) to letter (A,B,C,D)
            const letters = ['A', 'B', 'C', 'D'];
            const quizData = extracted.quizQuestions.map((q, idx) => {
              const optionsObj = {};
              q.options.forEach((opt, i) => {
                optionsObj[letters[i]] = opt;
              });
              return {
                day: dayNum,
                question_text: q.question,
                options: optionsObj,
                correct_option: letters[q.correctOption] || 'A',
                order_index: idx + 1,
              };
            });

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
