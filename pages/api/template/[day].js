import fs from 'fs';
import path from 'path';
import { getUserFromRequest, getGateStatus, getUserChallengeStatus } from '../../../lib/serverAuth';
import logger from '../../../lib/logger';
import { rateLimiters, applyRateLimit, getIdentifier } from '../../../lib/ratelimit';

/**
 * API route: /api/template/[day]
 *
 * Serves the raw HTML template for a day, with a postMessage bridge injected
 * so the template can communicate quiz/task completion to the parent app.
 */
export default async function handler(req, res) {
  // Apply rate limiting for general API access
  const identifier = getIdentifier(req);
  const limited = await applyRateLimit(req, res, rateLimiters.general, identifier);
  if (limited) return;

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
/* ENSURE affiliate links are visible */
.affiliate-link {
  display: inline-block !important;
  visibility: visible !important;
  opacity: 1 !important;
}
/* VALIDATION ERROR MESSAGE - visible on page since alert() is blocked in sandbox */
#mw-validation-error {
  position: fixed !important;
  top: 20px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  background: #dc3545 !important;
  color: white !important;
  padding: 20px 30px !important;
  border-radius: 10px !important;
  font-size: 18px !important;
  font-weight: bold !important;
  z-index: 999999 !important;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
  text-align: center !important;
  max-width: 90% !important;
  animation: mw-shake 0.5s ease-in-out !important;
}
@keyframes mw-shake {
  0%, 100% { transform: translateX(-50%) rotate(0); }
  25% { transform: translateX(-50%) rotate(-2deg); }
  75% { transform: translateX(-50%) rotate(2deg); }
}
#mw-validation-error .mw-close {
  position: absolute !important;
  top: 5px !important;
  right: 10px !important;
  cursor: pointer !important;
  font-size: 20px !important;
}
</style>
<script>
(function() {
  console.log('[MWBridge] Bridge script loading for Day ' + ${dayNum});

  // PostMessage bridge to communicate with parent app
  const DAY = ${dayNum};

  // NOTE: localStorage is already cleared by early script in <head>
  // This ensures template's DOMContentLoaded reads empty localStorage

  // Helper to send messages to parent
  function sendToParent(type, data) {
    if (window.parent !== window) {
      window.parent.postMessage({ type, day: DAY, ...data }, window.location.origin);
    }
  }

  // Show validation error on page (alert() is blocked in sandboxed iframe)
  function showValidationError(message) {
    console.log('[MWBridge] Showing validation error: ' + message);
    // Remove existing error if any
    var existing = document.getElementById('mw-validation-error');
    if (existing) existing.remove();

    // Create error element
    var errorDiv = document.createElement('div');
    errorDiv.id = 'mw-validation-error';
    errorDiv.innerHTML = '<span class="mw-close" onclick="this.parentElement.remove()">×</span>' + message;
    document.body.appendChild(errorDiv);

    // Auto-remove after 8 seconds
    setTimeout(function() {
      var el = document.getElementById('mw-validation-error');
      if (el) el.remove();
    }, 8000);

    // Scroll to top so user sees it
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        window._serverSaysTaskNotSubmitted = true; // Flag to track server state

        // Function to reset task UI - force button back to unsubmitted state
        function resetTaskUI() {
          var submitBtn = document.getElementById('submitTaskBtn');
          if (submitBtn) {
            submitBtn.textContent = 'Submit Day ' + DAY + ' Task';
            submitBtn.style.cssText = 'background: #f59e0b !important; color: #000 !important;';
            submitBtn.disabled = false;
          }
          var taskResponse = document.getElementById('taskResponse');
          if (taskResponse) taskResponse.disabled = false;
          var taskFile = document.getElementById('taskFile');
          if (taskFile) taskFile.disabled = false;
        }

        // Run reset multiple times to catch ALL template initialization
        setTimeout(resetTaskUI, 50);
        setTimeout(resetTaskUI, 150);
        setTimeout(resetTaskUI, 300);
        setTimeout(resetTaskUI, 500);
        setTimeout(resetTaskUI, 1000);
        setTimeout(resetTaskUI, 2000);

        // Watch for button changes and immediately revert them
        setTimeout(function() {
          var btn = document.getElementById('submitTaskBtn');
          if (btn) {
            var observer = new MutationObserver(function() {
              if (window._serverSaysTaskNotSubmitted && !window.taskSubmitted) {
                if (btn.textContent.includes('Submitted') || btn.disabled) {
                  console.log('[MWBridge] Reverting unauthorized task button change');
                  resetTaskUI();
                }
              }
            });
            observer.observe(btn, { attributes: true, childList: true, characterData: true, subtree: true });
          }
        }, 100);
      } else {
        window._serverSaysTaskNotSubmitted = false;
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
        window.taskSubmitted = true; // Always set global

        // Function to show task as submitted
        function showTaskAsSubmitted() {
          var submitBtn = document.getElementById('submitTaskBtn');
          if (submitBtn) {
            submitBtn.textContent = 'Task Submitted ✓';
            submitBtn.style.background = '#10b981';
            submitBtn.style.backgroundColor = '#10b981';
            submitBtn.style.color = 'white';
            submitBtn.disabled = true;
          }
          var taskResponse = document.getElementById('taskResponse');
          if (taskResponse) taskResponse.disabled = true;
          var taskFile = document.getElementById('taskFile');
          if (taskFile) taskFile.disabled = true;
        }

        // Run multiple times to catch late initialization
        setTimeout(showTaskAsSubmitted, 100);
        setTimeout(showTaskAsSubmitted, 300);
        setTimeout(showTaskAsSubmitted, 600);

        // Also call template's function if available
        setTimeout(function() {
          if (typeof window.showTaskSubmitted === 'function') {
            window.showTaskSubmitted();
          } else {
            // Fallback already handled above
            var submitBtn = document.getElementById('submitTaskBtn');
            if (submitBtn) {
              submitBtn.textContent = 'Task Submitted ✓';
              submitBtn.style.background = '#10b981';
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
    console.log('[MWBridge] hookFunctions() running - attempting to hook template functions');

    // Hook finishQuiz - this is called when user completes the quiz
    if (typeof window.finishQuiz === 'function' && !window.finishQuiz._hooked) {
      const originalFinishQuiz = window.finishQuiz;
      window.finishQuiz = function() {
        originalFinishQuiz.apply(this, arguments);
        // After original runs, send results to parent (always send, even on retake)
        if (typeof quizScore !== 'undefined' && typeof totalQuestions !== 'undefined') {
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

    // Hook submitQuiz - this is used by days 20-30 instead of finishQuiz
    if (typeof window.submitQuiz === 'function' && !window.submitQuiz._hooked) {
      const originalSubmitQuiz = window.submitQuiz;
      window.submitQuiz = function() {
        originalSubmitQuiz.apply(this, arguments);
        // After original runs, send results to parent (always send, even on retake)
        if (typeof quizScore !== 'undefined' && typeof correctAnswers !== 'undefined') {
          const total = correctAnswers.length;
          const passed = (quizScore / total) >= 0.6;
          sendToParent('QUIZ_COMPLETE', {
            score: quizScore,
            total: total,
            passed: passed,
            answers: typeof userAnswers !== 'undefined' ? userAnswers : {}
          });
          quizReported = true;
        }
      };
      window.submitQuiz._hooked = true;
    }

    // Hook retakeQuiz - reset quizReported so next attempt is reported
    if (typeof window.retakeQuiz === 'function' && !window.retakeQuiz._hooked) {
      const originalRetakeQuiz = window.retakeQuiz;
      window.retakeQuiz = function() {
        quizReported = false; // Reset so next completion is reported
        originalRetakeQuiz.apply(this, arguments);
      };
      window.retakeQuiz._hooked = true;
    }

    // Hook submitTask - this is called when user submits their task
    console.log('[MWBridge] Checking submitTask: exists=' + (typeof window.submitTask === 'function') + ', hooked=' + (window.submitTask && window.submitTask._hooked));
    if (typeof window.submitTask === 'function' && !window.submitTask._hooked) {
      const originalSubmitTask = window.submitTask;
      window.submitTask = async function() {
        console.log('[MWBridge] *** HOOKED submitTask CALLED ***');

        // Requirements per day
        // minFiles: 1 = file required (user can upload multiple), 0 = optional
        const requirements = {
          1: { minChars: 50, minFiles: 0 },    // Optional file
          2: { minChars: 50, minFiles: 1 },    // File required
          3: { minChars: 50, minFiles: 1 },    // File required
          4: { minChars: 50, minFiles: 1 },    // File required
          5: { minChars: 50, minFiles: 1 },    // File required
          6: { minChars: 100, minFiles: 1 },   // File required
          7: { minChars: 100, minFiles: 1 },   // File required
          8: { minChars: 100, minFiles: 1 },   // File required
          9: { minChars: 100, minFiles: 1 },   // File required
          10: { minChars: 100, minFiles: 1 },  // File required
          11: { minChars: 100, minFiles: 1 },  // File required
          12: { minChars: 150, minFiles: 1 },  // File required
          13: { minChars: 200, minFiles: 1 },  // File required
          14: { minChars: 100, minFiles: 1 },  // File required
          15: { minChars: 150, minFiles: 1 },  // File required
          16: { minChars: 150, minFiles: 1 },  // File required
          17: { minChars: 150, minFiles: 1 },  // File required
          18: { minChars: 200, minFiles: 1 },  // File required
          19: { minChars: 100, minFiles: 1 },  // File required
          20: { minChars: 200, minFiles: 1 },  // File required
          21: { minChars: 200, minFiles: 1 },  // File required
          22: { minChars: 200, minFiles: 1 },  // File required
          23: { minChars: 200, minFiles: 1 },  // File required
          24: { minChars: 200, minFiles: 1 },  // File required
          25: { minChars: 200, minFiles: 1 },  // File required
          26: { minChars: 200, minFiles: 1 },  // File required
          27: { minChars: 50, minFiles: 1 },   // File required
          28: { minChars: 200, minFiles: 1 },  // File required
          29: { minChars: 200, minFiles: 1 },  // File required
          30: { minChars: 0, minFiles: 0 }     // Quiz only - no task
        };

        const dayReqs = requirements[DAY] || { minChars: 50, minFiles: 0 };

        // Get task response and files
        const taskResponseEl = document.getElementById('taskResponse');
        const taskText = taskResponseEl ? taskResponseEl.value.trim() : '';

        // Check for pre-uploaded files (new UI) or file input (fallback)
        var preUploadedUrls = typeof getUploadedUrls === 'function' ? getUploadedUrls() : [];
        const taskFileEl = document.getElementById('taskFile');
        const pendingFiles = taskFileEl ? taskFileEl.files : [];
        const totalFiles = preUploadedUrls.length + pendingFiles.length;

        console.log('[MWBridge] submitTask called, text length:', taskText.length, 'pre-uploaded:', preUploadedUrls.length, 'pending:', pendingFiles.length);
        console.log('[MWBridge] Day ' + DAY + ' requires: ' + dayReqs.minChars + ' chars, ' + dayReqs.minFiles + ' files');

        // Check minimum character length
        console.log('[MWBridge] Checking char length: ' + taskText.length + ' < ' + dayReqs.minChars + ' = ' + (taskText.length < dayReqs.minChars));
        if (taskText.length < dayReqs.minChars) {
          var needed = dayReqs.minChars - taskText.length;
          var msg = 'Minimum ' + dayReqs.minChars + ' characters required. You need ' + needed + ' more characters. (Current: ' + taskText.length + ')';
          console.log('[MWBridge] VALIDATION FAILED: ' + msg);
          showValidationError(msg);
          return;
        }

        // Check if file upload is required
        console.log('[MWBridge] Checking file requirement: minFiles=' + dayReqs.minFiles + ', totalFiles=' + totalFiles);
        if (dayReqs.minFiles > 0 && totalFiles === 0) {
          var fileMsg = 'Please upload at least 1 screenshot for this task. File upload is required.';
          console.log('[MWBridge] VALIDATION FAILED: ' + fileMsg);
          showValidationError(fileMsg);
          return;
        }

        console.log('[MWBridge] Validation PASSED - proceeding with submission');

        // If already reported, don't re-submit
        if (taskReported) {
          console.log('[MWBridge] Task already submitted');
          return;
        }

        // Show submitting status
        var submitBtn = document.getElementById('submitTaskBtn');
        if (submitBtn) {
          submitBtn.textContent = 'Submitting...';
          submitBtn.disabled = true;
        }

        try {
          // Use pre-uploaded URLs (files already uploaded via new UI)
          var attachmentUrls = preUploadedUrls.slice();

          // Upload any pending files from old-style input (fallback)
          if (pendingFiles.length > 0) {
            console.log('[MWBridge] Uploading ' + pendingFiles.length + ' pending file(s)...');
            for (var i = 0; i < pendingFiles.length; i++) {
              var file = pendingFiles[i];
              if (submitBtn) {
                submitBtn.textContent = 'Uploading file ' + (i + 1) + '/' + pendingFiles.length + '...';
              }
              var formData = new FormData();
              formData.append('file', file);
              formData.append('day', DAY);

              var uploadRes = await fetch('/api/upload/task-file', {
                method: 'POST',
                credentials: 'include',
                body: formData
              });

              if (uploadRes.ok) {
                var uploadResult = await uploadRes.json();
                attachmentUrls.push(uploadResult.url);
                console.log('[MWBridge] Uploaded file:', uploadResult.url);
              } else {
                var errorMsg = 'File upload failed';
                try {
                  var errData = await uploadRes.json();
                  errorMsg = errData.error || errorMsg;
                } catch(e) {}
                throw new Error(errorMsg);
              }
            }
          }

          // Send to parent with text and attachment URLs
          console.log('[MWBridge] Sending TASK_COMPLETE to parent');
          sendToParent('TASK_COMPLETE', {
            response: taskText,
            attachmentUrls: attachmentUrls
          });
          taskReported = true;

          // Update UI to show success
          if (submitBtn) {
            submitBtn.textContent = 'Task Submitted ✓';
            submitBtn.style.background = '#10b981';
            submitBtn.style.color = 'white';
          }
          if (taskResponseEl) taskResponseEl.disabled = true;
          if (taskFileEl) taskFileEl.disabled = true;

        } catch (err) {
          console.error('[MWBridge] Task submission error:', err);
          showValidationError('Error: ' + err.message);
          if (submitBtn) {
            submitBtn.textContent = 'Submit Day ' + DAY + ' Task';
            submitBtn.disabled = false;
          }
        }
      };
      window.submitTask._hooked = true;
      console.log('[MWBridge] submitTask hooked successfully');
    }

    // Hook proceedToDay function (varies by day number)
    const proceedFn = window['proceedToDay' + (DAY + 1)] || window['proceedToDay2'] || window['proceedToNextDay'];
    if (proceedFn && !proceedFn._hooked) {
      const fnName = window['proceedToDay' + (DAY + 1)] ? 'proceedToDay' + (DAY + 1) :
                     window['proceedToDay2'] ? 'proceedToDay2' : 'proceedToNextDay';
      window[fnName] = function() {
        // Navigate via parent instead of in iframe
        sendToParent('NAVIGATE', { to: '/day/' + (DAY + 1) });
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

  // FALLBACK: Add direct click validation to submit button
  // This runs even if function hooking fails
  function addDirectButtonValidation() {
    var submitBtn = document.getElementById('submitTaskBtn');
    if (submitBtn && !submitBtn._mwValidationAdded) {
      console.log('[MWBridge] Adding direct click validation to submit button');
      submitBtn.addEventListener('click', function(e) {
        console.log('[MWBridge] Submit button clicked (direct listener)');

        // Requirements per day
        var requirements = {
          1: { minChars: 50, minFiles: 0 },
          2: { minChars: 50, minFiles: 1 },
          3: { minChars: 50, minFiles: 1 },
          4: { minChars: 50, minFiles: 1 },
          5: { minChars: 50, minFiles: 1 },
          6: { minChars: 100, minFiles: 1 },
          7: { minChars: 100, minFiles: 1 },
          8: { minChars: 100, minFiles: 1 },
          9: { minChars: 100, minFiles: 1 },
          10: { minChars: 100, minFiles: 1 },
          11: { minChars: 100, minFiles: 1 },
          12: { minChars: 150, minFiles: 1 },
          13: { minChars: 200, minFiles: 1 },
          14: { minChars: 100, minFiles: 1 },
          15: { minChars: 150, minFiles: 1 },
          16: { minChars: 150, minFiles: 1 },
          17: { minChars: 150, minFiles: 1 },
          18: { minChars: 200, minFiles: 1 },
          19: { minChars: 100, minFiles: 1 },
          20: { minChars: 200, minFiles: 1 },
          21: { minChars: 200, minFiles: 1 },
          22: { minChars: 200, minFiles: 1 },
          23: { minChars: 200, minFiles: 1 },
          24: { minChars: 200, minFiles: 1 },
          25: { minChars: 200, minFiles: 1 },
          26: { minChars: 200, minFiles: 1 },
          27: { minChars: 50, minFiles: 1 },
          28: { minChars: 200, minFiles: 1 },
          29: { minChars: 200, minFiles: 1 },
          30: { minChars: 0, minFiles: 0 }
        };

        var dayReqs = requirements[DAY] || { minChars: 50, minFiles: 0 };
        var taskResponseEl = document.getElementById('taskResponse');
        var taskText = taskResponseEl ? taskResponseEl.value.trim() : '';

        var preUploadedUrls = typeof getUploadedUrls === 'function' ? getUploadedUrls() : [];
        var taskFileEl = document.getElementById('taskFile');
        var pendingFiles = taskFileEl ? taskFileEl.files.length : 0;
        var totalFiles = preUploadedUrls.length + pendingFiles;

        console.log('[MWBridge] Direct validation: chars=' + taskText.length + '/' + dayReqs.minChars + ', files=' + totalFiles + '/' + dayReqs.minFiles);

        // Check minimum character length FIRST
        if (taskText.length < dayReqs.minChars) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          var needed = dayReqs.minChars - taskText.length;
          showValidationError('Minimum ' + dayReqs.minChars + ' characters required. You need ' + needed + ' more characters. (Current: ' + taskText.length + ')');
          return false;
        }

        // Check file requirement
        if (dayReqs.minFiles > 0 && totalFiles === 0) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          showValidationError('Please upload at least 1 screenshot for this task. File upload is required.');
          return false;
        }

        console.log('[MWBridge] Direct validation PASSED');
      }, true); // Use capture phase to run BEFORE onclick
      submitBtn._mwValidationAdded = true;
    }
  }

  // Run hooks after short delay to ensure template JS has run
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(hookFunctions, 100);
      setTimeout(addDirectButtonValidation, 150);
    });
  } else {
    setTimeout(hookFunctions, 100);
    setTimeout(addDirectButtonValidation, 150);
  }
})();
</script>
`;

  // Inject early localStorage clear script in <head> - runs BEFORE template scripts
  const earlyScript = `
<script>
(function() {
  // Clear localStorage immediately to prevent pollution from other user accounts
  var DAY = ${dayNum};
  localStorage.removeItem('day' + DAY + 'TaskSubmitted');
  localStorage.removeItem('day' + DAY + 'TaskResponse');
  localStorage.removeItem('day' + DAY + 'TaskFileName');
  localStorage.removeItem('day' + DAY + 'QuizCompleted');
  localStorage.removeItem('day' + DAY + 'QuizScore');
})();
</script>
`;

  // Inject early script in <head> to clear localStorage before template scripts run
  if (html.includes('</head>')) {
    html = html.replace('</head>', earlyScript + '</head>');
  }

  // Inject main bridge script before </body>
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
