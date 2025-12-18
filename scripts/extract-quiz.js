const fs = require('fs');
const path = require('path');

const contentDir = path.join(__dirname, '../src/content/days');
const outputFile = path.join(__dirname, '../supabase/quiz_seed.sql');

// Get all day HTML files
const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.html'));

// Sort files by day number
files.sort((a, b) => {
  const dayA = parseInt(a.match(/day(\d+)/)?.[1] || 0);
  const dayB = parseInt(b.match(/day(\d+)/)?.[1] || 0);
  return dayA - dayB;
});

let allQuestions = [];

function extractJSFormat(content, dayNumber) {
  // Format 1: JS array - const quizQuestions = [{...}]
  const questionsMatch = content.match(/const\s+quizQuestions\s*=\s*\[([\s\S]*?)\];/);
  const answersMatch = content.match(/let\s+correctAnswers\s*=\s*\[([^\]]+)\]/);
  
  if (!questionsMatch || !answersMatch) return null;
  
  const answersStr = answersMatch[1];
  const correctAnswers = answersStr.match(/['"]([a-d])['"]/gi).map(a => a.replace(/['"]/g, '').toLowerCase());
  
  const questionsStr = questionsMatch[1];
  const questionBlocks = [];
  let depth = 0;
  let currentBlock = '';
  let inBlock = false;
  
  for (let i = 0; i < questionsStr.length; i++) {
    const char = questionsStr[i];
    if (char === '{') { if (depth === 0) inBlock = true; depth++; }
    if (inBlock) currentBlock += char;
    if (char === '}') {
      depth--;
      if (depth === 0 && inBlock) {
        questionBlocks.push(currentBlock);
        currentBlock = '';
        inBlock = false;
      }
    }
  }
  
  const questions = [];
  questionBlocks.forEach((block, idx) => {
    const questionMatch = block.match(/question:\s*["'`]([\s\S]*?)["'`]\s*,/);
    const optionsMatch = block.match(/options:\s*\[([\s\S]*?)\]/);
    const explanationMatch = block.match(/explanation:\s*["'`]([\s\S]*?)["'`]/);
    
    if (!questionMatch || !optionsMatch) return;
    
    const questionText = questionMatch[1].replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
    const explanation = explanationMatch ? explanationMatch[1].replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim() : '';
    
    const optionsStr = optionsMatch[1];
    const options = [];
    const optionRegex = /["'`]([\s\S]*?)["'`]/g;
    let match;
    while ((match = optionRegex.exec(optionsStr)) !== null) {
      options.push(match[1].replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim());
    }
    
    if (options.length === 4) {
      questions.push({
        day: dayNumber,
        order: idx + 1,
        question: questionText,
        optionA: options[0],
        optionB: options[1],
        optionC: options[2],
        optionD: options[3],
        correct: correctAnswers[idx]?.toUpperCase() || 'A',
        explanation: explanation
      });
    }
  });
  
  return questions.length > 0 ? questions : null;
}

function extractHTMLFormat(content, dayNumber) {
  // Format 2: HTML inline - <div class="question-container">...</div>
  const answersMatch = content.match(/let\s+correctAnswers\s*=\s*\[([^\]]+)\]/);
  if (!answersMatch) return null;
  
  const answersStr = answersMatch[1];
  const correctAnswers = answersStr.match(/['"]([a-d])['"]/gi)?.map(a => a.replace(/['"]/g, '').toLowerCase()) || [];
  
  const questions = [];
  let questionTexts = [];
  let match;
  
  // Try Format A: <div class="question-text">...</div>
  const questionTextRegex = /<div class="question-text"[^>]*>([\s\S]*?)<\/div>/g;
  while ((match = questionTextRegex.exec(content)) !== null) {
    let text = match[1].replace(/^\s*\d+\.\s*/, '').trim();
    text = text.replace(/\s+/g, ' ');
    if (text) questionTexts.push(text);
  }
  
  // Try Format B: <strong>N.</strong> question text inside a div
  if (questionTexts.length === 0) {
    const strongQRegex = /<strong>\d+\.<\/strong>\s*([\s\S]*?)<\/div>/g;
    while ((match = strongQRegex.exec(content)) !== null) {
      let text = match[1].trim().replace(/\s+/g, ' ');
      if (text) questionTexts.push(text);
    }
  }
  
  // Try Format C: Find question containers and extract text
  if (questionTexts.length === 0) {
    const containerRegex = /<div class="question-container"[^>]*data-question="(\d+)"[^>]*>([\s\S]*?)<div class="quiz-options"/g;
    const containerMatches = [];
    while ((match = containerRegex.exec(content)) !== null) {
      containerMatches.push({ num: parseInt(match[1]), content: match[2] });
    }
    containerMatches.sort((a, b) => a.num - b.num);
    
    for (const container of containerMatches) {
      // Extract text between <strong>N.</strong> and end of container content
      const textMatch = container.content.match(/<strong>\d+\.<\/strong>\s*([\s\S]*)/);
      if (textMatch) {
        let text = textMatch[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
        if (text) questionTexts.push(text);
      }
    }
  }
  
  // Find options for each question - handle multiple formats
  // Format A: <div class="quiz-option" data-answer="a">...<span>text</span></div>
  // Format B: <div class="quiz-option" data-answer="a"><span class="option-letter">A)</span> text</div>
  const allOptions = [];
  
  // Try Format A first
  const optionRegexA = /<div class="quiz-option"[^>]*data-answer="([a-d])"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/g;
  while ((match = optionRegexA.exec(content)) !== null) {
    allOptions.push({ letter: match[1], text: match[2].trim() });
  }
  
  // If no options found, try Format B
  if (allOptions.length === 0) {
    const optionRegexB = /<div class="quiz-option"[^>]*data-answer="([a-d])"[^>]*>\s*<span class="option-letter">[A-D]\)<\/span>\s*([^<]+)/g;
    while ((match = optionRegexB.exec(content)) !== null) {
      allOptions.push({ letter: match[1], text: match[2].trim() });
    }
  }
  
  // If still no options, try Format C: option text after option-letter div
  if (allOptions.length === 0) {
    const optionRegexC = /<div class="quiz-option"[^>]*data-answer="([a-d])"[^>]*>[\s\S]*?<div class="option-letter">[A-D]<\/div>\s*<span>([^<]+)<\/span>/g;
    while ((match = optionRegexC.exec(content)) !== null) {
      allOptions.push({ letter: match[1], text: match[2].trim() });
    }
  }
  
  // Group options by 4s (each question has 4 options)
  for (let i = 0; i < questionTexts.length; i++) {
    const optionStart = i * 4;
    if (optionStart + 3 >= allOptions.length) break;
    
    const qOptions = allOptions.slice(optionStart, optionStart + 4);
    
    // Sort options by letter
    const sortedOptions = ['a', 'b', 'c', 'd'].map(letter => 
      qOptions.find(o => o.letter === letter)?.text || ''
    );
    
    if (sortedOptions.every(o => o)) {
      questions.push({
        day: dayNumber,
        order: i + 1,
        question: questionTexts[i],
        optionA: sortedOptions[0],
        optionB: sortedOptions[1],
        optionC: sortedOptions[2],
        optionD: sortedOptions[3],
        correct: correctAnswers[i]?.toUpperCase() || 'A',
        explanation: ''
      });
    }
  }
  
  return questions.length > 0 ? questions : null;
}

files.forEach(file => {
  const dayMatch = file.match(/day(\d+)/);
  if (!dayMatch) return;
  
  const dayNumber = parseInt(dayMatch[1]);
  const filePath = path.join(contentDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Try JS format first
  let questions = extractJSFormat(content, dayNumber);
  
  // If no JS format, try HTML format
  if (!questions) {
    questions = extractHTMLFormat(content, dayNumber);
  }
  
  if (questions && questions.length > 0) {
    allQuestions.push(...questions);
    console.log(`Day ${dayNumber}: ${questions.length} questions extracted`);
  } else {
    console.log(`Day ${dayNumber}: No quiz found`);
  }
});

// Generate SQL
let sql = `-- Quiz Questions Seed Data
-- Generated: ${new Date().toISOString()}
-- Total Questions: ${allQuestions.length}

-- Clear existing questions
DELETE FROM quiz_questions;

-- Insert questions
INSERT INTO quiz_questions (day_number, order_index, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation)
VALUES
`;

const escapeSQL = (str) => str.replace(/'/g, "''");

const values = allQuestions.map(q => 
  `(${q.day}, ${q.order}, '${escapeSQL(q.question)}', '${escapeSQL(q.optionA)}', '${escapeSQL(q.optionB)}', '${escapeSQL(q.optionC)}', '${escapeSQL(q.optionD)}', '${q.correct}', '${escapeSQL(q.explanation)}')`
);

sql += values.join(',\n');
sql += ';\n';

fs.writeFileSync(outputFile, sql);
console.log(`\nGenerated: ${outputFile}`);
console.log(`Total questions: ${allQuestions.length}`);

// Summary by day
const summary = {};
allQuestions.forEach(q => {
  summary[q.day] = (summary[q.day] || 0) + 1;
});
console.log('\nQuestions per day:');
Object.keys(summary).sort((a, b) => parseInt(a) - parseInt(b)).forEach(day => {
  console.log(`  Day ${day}: ${summary[day]} questions`);
});
