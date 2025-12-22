import fs from 'fs';
import path from 'path';
import { getUserFromRequest, getGateStatus, getUserChallengeStatus } from '../../../lib/serverAuth';

/**
 * API route: /api/template/[day]
 *
 * Serves the raw HTML template for a day, with a postMessage bridge injected
 * so the template can communicate quiz/task completion to the parent app.
 */
export default async function handler(req, res) {
  const { day } = req.query;
  const dayNum = parseInt(day, 10);

  if (isNaN(dayNum) || dayNum < 1 || dayNum > 30) {
    return res.status(400).json({ error: 'Invalid day number' });
  }

  // Verify user has access
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).send('<h1>Please log in to view this content</h1>');
  }

  const gate = await getGateStatus(user.id);
  if (!gate.hasPaid) {
    return res.status(403).send('<h1>Payment required</h1>');
  }

  const challengeStatus = await getUserChallengeStatus(user.id);
  if (!challengeStatus.unlockedDays.includes(dayNum)) {
    return res.status(403).send('<h1>This day is not unlocked yet</h1>');
  }

  // Find the template file - check both new and old directories
  const newTemplateDir = path.join(process.cwd(), 'templates/days/market_warrior_days_content');
  const oldTemplateDir = path.join(process.cwd(), 'templates/days');

  let templatePath = null;
  let html = null;

  // Check new directory first (simple day1.html format)
  const newExactPath = path.join(newTemplateDir, `day${dayNum}.html`);
  if (fs.existsSync(newExactPath)) {
    templatePath = newExactPath;
  }

  // Check old directory patterns if not found
  if (!templatePath) {
    const oldExactPath = path.join(oldTemplateDir, `day${dayNum}.html`);
    if (fs.existsSync(oldExactPath)) {
      templatePath = oldExactPath;
    } else {
      // Try to find file with suffix (day15_risk_management.html format)
      try {
        const files = fs.readdirSync(oldTemplateDir);
        const matchingFile = files.find(f => f.startsWith(`day${dayNum}_`) && f.endsWith('.html'));
        if (matchingFile) {
          templatePath = path.join(oldTemplateDir, matchingFile);
        }
      } catch (e) {
        // Directory might not exist
      }
    }
  }

  if (!templatePath || !fs.existsSync(templatePath)) {
    return res.status(404).send(`<h1>Template for Day ${dayNum} not found</h1>`);
  }

  html = fs.readFileSync(templatePath, 'utf-8');

  // Inject the postMessage bridge script before </body>
  const bridgeScript = `
<style>
/* Hide the completion buttons at the bottom - navigation is in the top bar */
.completion-section .completion-button,
.completion-section button {
  display: none !important;
}
/* Keep the green completion box text visible */
.completion-section {
  padding-bottom: 30px !important;
}
/* Hide the Day Unlock Schedule box - it shows incorrect info */
#dayUnlockInfo {
  display: none !important;
}
</style>
<script>
(function() {
  // PostMessage bridge to communicate with parent app
  const DAY = ${dayNum};

  // Helper to send messages to parent
  function sendToParent(type, data) {
    if (window.parent !== window) {
      window.parent.postMessage({ type, day: DAY, ...data }, '*');
    }
  }

  // Track if we've already sent completion messages
  let quizReported = false;
  let taskReported = false;

  // Listen for messages from parent (e.g., init with existing progress)
  window.addEventListener('message', function(event) {
    if (event.origin !== window.location.origin) return;
    if (event.data.type === 'INIT') {
      console.log('[MWBridge] Initialized with:', event.data);

      // IMPORTANT: Clear localStorage entries that don't match server state
      // This prevents cross-account pollution when using same browser
      if (!event.data.quizPassed) {
        localStorage.removeItem('day' + DAY + 'QuizCompleted');
        localStorage.removeItem('day' + DAY + 'QuizScore');
        if (typeof window.quizCompleted !== 'undefined') window.quizCompleted = false;
      }
      if (!event.data.taskSubmitted) {
        localStorage.removeItem('day' + DAY + 'TaskSubmitted');
        localStorage.removeItem('day' + DAY + 'TaskResponse');
        localStorage.removeItem('day' + DAY + 'TaskFileName');
        window.taskSubmitted = false;

        // Function to reset task UI
        function resetTaskUI() {
          var submitBtn = document.getElementById('submitTaskBtn');
          if (submitBtn) {
            submitBtn.textContent = 'Submit Day ' + DAY + ' Task';
            submitBtn.style.backgroundColor = '';
            submitBtn.style.background = '#f59e0b';
            submitBtn.style.color = '#000';
            submitBtn.disabled = false;
          }
          var taskResponse = document.getElementById('taskResponse');
          if (taskResponse) taskResponse.disabled = false;
          var taskFile = document.getElementById('taskFile');
          if (taskFile) taskFile.disabled = false;
          var taskStatus = document.querySelector('.task-status, .submission-status');
          if (taskStatus && taskStatus.textContent.includes('Submitted')) {
            taskStatus.style.display = 'none';
          }
        }

        // Run reset multiple times to catch late template initialization
        setTimeout(resetTaskUI, 100);
        setTimeout(resetTaskUI, 300);
        setTimeout(resetTaskUI, 600);

        // Also watch for button changes and revert them
        setTimeout(function() {
          var btn = document.getElementById('submitTaskBtn');
          if (btn) {
            var observer = new MutationObserver(function(mutations) {
              if (!window.taskSubmitted && btn.textContent.includes('Submitted')) {
                resetTaskUI();
              }
            });
            observer.observe(btn, { attributes: true, childList: true, characterData: true });
          }
        }, 150);
      }

      // If quiz already passed, update state AND UI
      if (event.data.quizPassed) {
        quizReported = true;
        if (typeof window.quizCompleted !== 'undefined') window.quizCompleted = true;
        if (typeof window.quizScore !== 'undefined' && typeof window.totalQuestions !== 'undefined') {
          window.quizScore = Math.ceil(window.totalQuestions * 0.6); // Assume passing score
        }
        // Update quiz UI to show as completed
        setTimeout(function() {
          var quizContent = document.getElementById('quizContent');
          var quizResults = document.getElementById('quizResults');
          var quizNav = document.querySelector('.quiz-navigation');
          var quizProgress = document.querySelector('.quiz-progress');
          var questionCounter = document.getElementById('questionCounter');

          if (quizContent) quizContent.style.display = 'none';
          if (quizNav) quizNav.style.display = 'none';
          if (quizProgress) quizProgress.style.display = 'none';
          if (questionCounter) questionCounter.style.display = 'none';

          if (quizResults) {
            quizResults.style.display = 'block';
            quizResults.innerHTML = '<div style="text-align:center; padding: 40px;"><div style="font-size: 60px; color: #10b981;">✓</div><h3 style="color: #10b981; margin: 20px 0;">Quiz Already Completed!</h3><p style="color: #6b7280;">You passed this quiz. Scroll down to the task section.</p></div>';
          }
        }, 200);
      }

      // If task already submitted, update state AND UI
      if (event.data.taskSubmitted) {
        taskReported = true;
        if (typeof window.taskSubmitted !== 'undefined') window.taskSubmitted = true;
        // Update task UI to show as submitted
        setTimeout(function() {
          if (typeof window.showTaskSubmitted === 'function') {
            window.showTaskSubmitted();
          } else {
            // Fallback: manually update task button
            var submitBtn = document.getElementById('submitTaskBtn');
            if (submitBtn) {
              submitBtn.textContent = 'Task Submitted ✓';
              submitBtn.style.backgroundColor = '#28a745';
              submitBtn.style.color = 'white';
              submitBtn.disabled = true;
            }
            var taskResponse = document.getElementById('taskResponse');
            if (taskResponse) taskResponse.disabled = true;
            var taskFile = document.getElementById('taskFile');
            if (taskFile) taskFile.disabled = true;
          }
        }, 200);
      }
    }
  });

  // Notify parent that template is loaded
  window.addEventListener('load', function() {
    sendToParent('TEMPLATE_LOADED', {});
  });

  // Hook into template functions after DOM is ready
  function hookFunctions() {
    // Hook finishQuiz - this is called when user completes the quiz
    if (typeof window.finishQuiz === 'function' && !window.finishQuiz._hooked) {
      const originalFinishQuiz = window.finishQuiz;
      window.finishQuiz = function() {
        originalFinishQuiz.apply(this, arguments);
        // After original runs, send results to parent
        if (!quizReported && typeof quizScore !== 'undefined' && typeof totalQuestions !== 'undefined') {
          const passed = (quizScore / totalQuestions) >= 0.6;
          sendToParent('QUIZ_COMPLETE', {
            score: quizScore,
            total: totalQuestions,
            passed: passed,
            answers: typeof userAnswers !== 'undefined' ? userAnswers : {}
          });
          quizReported = true;
        }
      };
      window.finishQuiz._hooked = true;
    }

    // Hook submitTask - this is called when user submits their task
    if (typeof window.submitTask === 'function' && !window.submitTask._hooked) {
      const originalSubmitTask = window.submitTask;
      window.submitTask = function() {
        // Get task response before original function might clear it
        const taskResponseEl = document.getElementById('taskResponse');
        const taskText = taskResponseEl ? taskResponseEl.value.trim() : '';

        // Check minimum length before proceeding
        if (taskText.length < 50) {
          // Let original function show error
          originalSubmitTask.apply(this, arguments);
          return;
        }

        originalSubmitTask.apply(this, arguments);

        // After original runs, send to parent
        if (!taskReported && taskText.length >= 50) {
          sendToParent('TASK_COMPLETE', {
            response: taskText
          });
          taskReported = true;
        }
      };
      window.submitTask._hooked = true;
    }

    // Hook proceedToDay function (varies by day number)
    const proceedFn = window['proceedToDay' + (DAY + 1)] || window['proceedToDay2'] || window['proceedToNextDay'];
    if (proceedFn && !proceedFn._hooked) {
      const fnName = window['proceedToDay' + (DAY + 1)] ? 'proceedToDay' + (DAY + 1) :
                     window['proceedToDay2'] ? 'proceedToDay2' : 'proceedToNextDay';
      window[fnName] = function() {
        // Navigate via parent instead of in iframe
        sendToParent('NAVIGATE', { to: '/day-template/' + (DAY + 1) });
      };
      window[fnName]._hooked = true;
    }

    // Also hook any "Go to Dashboard" buttons
    document.querySelectorAll('button, a').forEach(function(el) {
      if (el.textContent.toLowerCase().includes('dashboard')) {
        el.addEventListener('click', function(e) {
          e.preventDefault();
          sendToParent('NAVIGATE', { to: '/dashboard' });
        });
      }
    });
  }

  // Run hooks after short delay to ensure template JS has run
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(hookFunctions, 100);
    });
  } else {
    setTimeout(hookFunctions, 100);
  }
})();
</script>
`;

  // Inject bridge script before </body>
  if (html.includes('</body>')) {
    html = html.replace('</body>', bridgeScript + '</body>');
  } else {
    html += bridgeScript;
  }

  // Set headers for HTML response
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Prevent caching to ensure fresh state for each user
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  return res.status(200).send(html);
}
