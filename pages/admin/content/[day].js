import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getSupabaseClient } from '../../../lib/supabase';
import DOMPurify from 'isomorphic-dompurify';

export default function ContentEditor() {
  const router = useRouter();
  const { day } = router.query;
  const editorRef = useRef(null);
  const isTypingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editMode, setEditMode] = useState('visual'); // 'visual' or 'html'

  // Content state
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [taskPrompt, setTaskPrompt] = useState('');

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [savingQuiz, setSavingQuiz] = useState(false);

  const [message, setMessage] = useState({ type: '', text: '' });
  const [seeding, setSeeding] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Link modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // XSS Protection: Sanitize HTML content
  const sanitizeHtml = (html) => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h2', 'h3', 'h4', 'h5', 'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'div', 'span', 'blockquote', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'target', 'rel']
    });
  };

  useEffect(() => {
    if (day) {
      checkAdminAndLoad();
    }
  }, [day]);

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  async function checkAdminAndLoad() {
    try {
      // Validate day parameter
      const dayNum = parseInt(day);
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 30) {
        setMessage({ type: 'error', text: 'Invalid day number. Must be between 1 and 30.' });
        router.push('/admin');
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        router.push('/login');
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (res.status === 403 || res.status === 401) {
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);
      loadContent();
    } catch (err) {
      console.error('Admin check error:', err);
      router.push('/dashboard');
    }
  }

  async function loadContent() {
    setLoading(true);
    try {
      // Load day content
      const contentRes = await fetch(`/api/admin/content?day=${day}`, { credentials: 'include' });
      const contentData = await contentRes.json();

      if (contentData.day) {
        setTitle(contentData.day.title || '');
        setVideoUrl(contentData.day.video_url || '');
        setHtmlContent(contentData.day.html_content || '');
        setTaskPrompt(contentData.day.task_prompt || '');
      }

      // Load quiz questions
      const quizRes = await fetch(`/api/admin/quiz?day=${day}`, { credentials: 'include' });
      const quizData = await quizRes.json();
      setQuizQuestions(quizData.questions || []);

    } catch (err) {
      console.error('Load error:', err);
      setMessage({ type: 'error', text: 'Failed to load content' });
    }
    setLoading(false);
  }

  async function saveContent() {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          day: parseInt(day),
          title,
          video_url: videoUrl,
          html_content: htmlContent,
          task_prompt: taskPrompt,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Content saved successfully!' });
        setHasUnsavedChanges(false);
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Save failed: ${err.message}` });
    }
    setSaving(false);
  }

  // Rich text editor commands
  function execCommand(command, value = null) {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateHtmlContent();
  }

  function updateHtmlContent() {
    if (editorRef.current) {
      isTypingRef.current = true;
      const newContent = editorRef.current.innerHTML;
      setHtmlContent(newContent);
      setHasUnsavedChanges(true);
      // Reset flag after state update completes
      setTimeout(() => { isTypingRef.current = false; }, 0);
    }
  }

  // Sync editor content when htmlContent changes from external sources (e.g., loading from DB or switching modes)
  useEffect(() => {
    if (editorRef.current && editMode === 'visual' && !isTypingRef.current) {
      // Only update if content actually changed (prevent cursor reset during typing)
      if (editorRef.current.innerHTML !== htmlContent) {
        editorRef.current.innerHTML = htmlContent;
      }
    }
  }, [htmlContent, editMode]);

  function insertHeading() {
    execCommand('formatBlock', 'h3');
  }

  function insertParagraph() {
    execCommand('formatBlock', 'p');
  }

  function insertLink() {
    // Check if there's selected text
    const selection = window.getSelection();
    const selectedText = selection.toString();

    if (selectedText) {
      setLinkText(selectedText);
    } else {
      setLinkText('');
    }
    setLinkUrl('https://');
    setShowLinkModal(true);
  }

  function handleInsertLink() {
    if (!linkUrl || linkUrl === 'https://') {
      alert('Please enter a valid URL');
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection.toString();

    if (selectedText) {
      // If text is selected, just create the link
      execCommand('createLink', linkUrl);
    } else if (linkText) {
      // If no selection but user provided text, insert it
      document.execCommand('insertHTML', false, `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`);
      if (editorRef.current) {
        editorRef.current.focus();
        updateHtmlContent();
      }
    } else {
      alert('Please enter link text or select text first');
      return;
    }

    // Close modal and reset
    setShowLinkModal(false);
    setLinkText('');
    setLinkUrl('https://');
  }

  function insertImage() {
    const url = prompt('Enter image URL:');
    if (url) {
      execCommand('insertImage', url);
    }
  }

  function insertTable() {
    const rows = prompt('Number of rows:', '3');
    const cols = prompt('Number of columns:', '3');
    if (rows && cols) {
      let table = '<table style="border-collapse: collapse; width: 100%; margin: 15px 0;">';
      for (let i = 0; i < parseInt(rows); i++) {
        table += '<tr>';
        for (let j = 0; j < parseInt(cols); j++) {
          const tag = i === 0 ? 'th' : 'td';
          table += `<${tag} style="border: 1px solid #334155; padding: 10px;">${i === 0 ? 'Header' : 'Cell'}</${tag}>`;
        }
        table += '</tr>';
      }
      table += '</table>';
      execCommand('insertHTML', table);
    }
  }

  // Quiz question handlers
  function addQuestion() {
    setQuizQuestions([
      ...quizQuestions,
      { id: null, question: '', options: ['', ''], correct_option: 0, isNew: true }
    ]);
    setHasUnsavedChanges(true);
  }

  function updateQuestion(index, field, value) {
    const updated = [...quizQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setQuizQuestions(updated);
    setHasUnsavedChanges(true);
  }

  function updateOption(qIndex, optIndex, value) {
    const updated = [...quizQuestions];
    updated[qIndex].options[optIndex] = value;
    setQuizQuestions(updated);
    setHasUnsavedChanges(true);
  }

  async function removeQuestion(index) {
    if (!confirm('Delete this question?')) return;
    const q = quizQuestions[index];

    // Delete from database if it exists
    if (q.id && !q.isNew) {
      try {
        const res = await fetch('/api/admin/quiz', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: q.id }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Delete failed');
        }
      } catch (err) {
        setMessage({ type: 'error', text: `Failed to delete question: ${err.message}` });
        return; // Don't remove from UI if API call failed
      }
    }

    // Only remove from UI if API succeeded (or if it was a new unsaved question)
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  }

  async function saveQuiz() {
    setSavingQuiz(true);
    setMessage({ type: '', text: '' });

    let successCount = 0;
    let failCount = 0;
    const errors = [];
    const validationErrors = [];

    try {
      // First, remove empty questions from UI
      const nonEmptyQuestions = quizQuestions.filter(q => q.question.trim());
      if (nonEmptyQuestions.length < quizQuestions.length) {
        setQuizQuestions(nonEmptyQuestions);
      }

      for (const q of nonEmptyQuestions) {
        try {
          // Validate and filter options
          const filledOptions = q.options.filter(o => o.trim());

          // Validate minimum 2 options
          if (filledOptions.length < 2) {
            validationErrors.push(`Question "${q.question.substring(0, 50)}..." needs at least 2 options`);
            failCount++;
            continue;
          }

          // Adjust correct_option if it's out of bounds after filtering
          let adjustedCorrectOption = q.correct_option;
          if (adjustedCorrectOption >= filledOptions.length) {
            adjustedCorrectOption = 0; // Reset to first option if index invalid
          }

          const method = (q.isNew || !q.id) ? 'POST' : 'PUT';
          const body = (q.isNew || !q.id)
            ? {
                day: parseInt(day),
                question: q.question,
                options: filledOptions,
                correct_option: adjustedCorrectOption,
              }
            : {
                id: q.id,
                question: q.question,
                options: filledOptions,
                correct_option: adjustedCorrectOption,
              };

          const res = await fetch('/api/admin/quiz', {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body),
          });

          if (res.ok) {
            successCount++;
          } else {
            failCount++;
            const errorData = await res.json();
            errors.push(errorData.error || 'Unknown error');
          }
        } catch (err) {
          failCount++;
          errors.push(err.message);
        }
      }

      // Reload ONLY quiz questions to get updated IDs (don't reload content)
      if (successCount > 0) {
        try {
          const quizRes = await fetch(`/api/admin/quiz?day=${day}`, { credentials: 'include' });
          const quizData = await quizRes.json();
          setQuizQuestions(quizData.questions || []);
        } catch (err) {
          console.error('Failed to reload quiz:', err);
        }
      }

      // Show results
      const allErrors = [...validationErrors, ...errors];
      if (failCount === 0) {
        setMessage({ type: 'success', text: `Successfully saved ${successCount} question(s)!` });
        setHasUnsavedChanges(false);
      } else if (successCount > 0) {
        setMessage({
          type: 'error',
          text: `Saved ${successCount} question(s), but ${failCount} failed. ${allErrors.slice(0, 3).join('; ')}`
        });
      } else {
        setMessage({
          type: 'error',
          text: `Save failed: ${allErrors.slice(0, 3).join('; ')}`
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Save failed: ${err.message}` });
    }
    setSavingQuiz(false);
  }

  async function seedFromHTML() {
    if (!confirm(`Import Day ${day} content from HTML file? This will overwrite current content.`)) {
      return;
    }

    setSeeding(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/seed-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ daysToSeed: [parseInt(day)] }),
      });

      const data = await res.json();
      if (data.success) {
        const seeded = data.results?.seeded || [];
        if (seeded.length > 0) {
          setMessage({
            type: 'success',
            text: `Imported: ${seeded[0].title} (${seeded[0].quizQuestions} quiz questions)`
          });
          loadContent();
        } else {
          setMessage({ type: 'error', text: 'No HTML file found for this day' });
        }
      } else {
        throw new Error(data.error || 'Failed to import');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
    setSeeding(false);
  }

  async function seedAllDays() {
    if (!confirm('Import ALL 30 days from HTML files? This will overwrite all existing content.')) {
      return;
    }

    setSeeding(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/seed-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}), // No daysToSeed = seed all
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: `Imported ${data.results?.seeded?.length || 0} days successfully!`
        });
        loadContent();
      } else {
        throw new Error(data.error || 'Failed to import');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
    setSeeding(false);
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading editor...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <>
      <Head>
        <title>Edit Day {day} - Admin</title>
      </Head>

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.backBtn} onClick={() => router.push('/admin')}>
              ← Back to Admin
            </button>
            <h1 style={styles.title}>Edit Day {day}</h1>
          </div>
          <div style={styles.headerRight}>
            <button
              style={{...styles.importBtn, opacity: seeding ? 0.6 : 1}}
              onClick={seedFromHTML}
              disabled={seeding}
            >
              {seeding ? 'Importing...' : 'Import Day from HTML'}
            </button>
            <button
              style={{...styles.importAllBtn, opacity: seeding ? 0.6 : 1}}
              onClick={seedAllDays}
              disabled={seeding}
            >
              Import All 30 Days
            </button>
            <select
              style={styles.daySelect}
              value={day}
              onChange={(e) => router.push(`/admin/content/${e.target.value}`)}
            >
              {Array.from({ length: 30 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Day {i + 1}</option>
              ))}
            </select>
          </div>
        </div>

        {message.text && (
          <div style={{
            ...styles.message,
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
          }}>
            {message.text}
          </div>
        )}

        {/* Content Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Content</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Day Title</label>
            <input
              type="text"
              style={styles.input}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setHasUnsavedChanges(true); }}
              placeholder="e.g., Introduction to Trading"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>YouTube Video URL</label>
            <input
              type="text"
              style={styles.input}
              value={videoUrl}
              onChange={(e) => { setVideoUrl(e.target.value); setHasUnsavedChanges(true); }}
              placeholder="e.g., https://www.youtube.com/embed/VIDEO_ID"
            />
            <small style={styles.hint}>Use embed URL format: https://www.youtube.com/embed/VIDEO_ID</small>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Lesson Content</label>

            {/* Mode Toggle */}
            <div style={styles.editorModeToggle}>
              <button
                type="button"
                style={{...styles.modeBtn, background: editMode === 'visual' ? '#3b82f6' : '#e2e8f0', color: editMode === 'visual' ? 'white' : '#475569'}}
                onClick={() => setEditMode('visual')}
              >
                Visual Editor
              </button>
              <button
                type="button"
                style={{...styles.modeBtn, background: editMode === 'html' ? '#3b82f6' : '#e2e8f0', color: editMode === 'html' ? 'white' : '#475569'}}
                onClick={() => setEditMode('html')}
              >
                HTML Source
              </button>
              <button
                type="button"
                style={{...styles.modeBtn, background: showPreview ? '#10b981' : '#e2e8f0', color: showPreview ? 'white' : '#475569'}}
                onClick={() => setShowPreview(!showPreview)}
              >
                Preview
              </button>
            </div>

            {editMode === 'visual' && !showPreview && (
              <>
                {/* Toolbar */}
                <div style={styles.toolbar}>
                  <button type="button" style={styles.toolBtn} onClick={insertHeading} title="Heading (H3)">H3</button>
                  <button type="button" style={styles.toolBtn} onClick={insertParagraph} title="Paragraph">¶</button>
                  <span style={styles.toolDivider}>|</span>
                  <button type="button" style={styles.toolBtn} onClick={() => execCommand('bold')} title="Bold"><b>B</b></button>
                  <button type="button" style={styles.toolBtn} onClick={() => execCommand('italic')} title="Italic"><i>I</i></button>
                  <button type="button" style={styles.toolBtn} onClick={() => execCommand('underline')} title="Underline"><u>U</u></button>
                  <span style={styles.toolDivider}>|</span>
                  <button type="button" style={styles.toolBtn} onClick={() => execCommand('insertUnorderedList')} title="Bullet List">• List</button>
                  <button type="button" style={styles.toolBtn} onClick={() => execCommand('insertOrderedList')} title="Numbered List">1. List</button>
                  <span style={styles.toolDivider}>|</span>
                  <button type="button" style={styles.toolBtn} onClick={insertLink} title="Insert Link">🔗 Link</button>
                  <button type="button" style={styles.toolBtn} onClick={insertImage} title="Insert Image">📷 Image</button>
                  <button type="button" style={styles.toolBtn} onClick={insertTable} title="Insert Table">📊 Table</button>
                </div>

                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="visual-editor mw-lesson"
                  style={styles.editor}
                  onInput={updateHtmlContent}
                  onBlur={updateHtmlContent}
                />
              </>
            )}

            {editMode === 'html' && !showPreview && (
              <textarea
                style={styles.htmlEditor}
                value={htmlContent}
                onChange={(e) => { setHtmlContent(e.target.value); setHasUnsavedChanges(true); }}
                placeholder="Enter HTML content directly..."
                spellCheck={false}
              />
            )}

            {showPreview && (
              <div className="preview-container mw-lesson" dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlContent) }} />
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Daily Task Prompt</label>
            <textarea
              style={styles.textarea}
              value={taskPrompt}
              onChange={(e) => { setTaskPrompt(e.target.value); setHasUnsavedChanges(true); }}
              placeholder="Describe the task the user needs to complete..."
              rows={4}
            />
          </div>

          <button
            style={{...styles.saveBtn, opacity: saving ? 0.6 : 1}}
            onClick={saveContent}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Content'}
          </button>
        </div>

        {/* Quiz Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Quiz Questions ({quizQuestions.length})</h2>
            <button style={styles.addBtn} onClick={addQuestion}>+ Add Question</button>
          </div>

          {quizQuestions.map((q, qIndex) => (
            <div key={q.id || `new-${qIndex}`} style={styles.questionCard}>
              <div style={styles.questionHeader}>
                <span style={styles.questionNum}>Question {qIndex + 1}</span>
                <button
                  style={styles.deleteBtn}
                  onClick={() => removeQuestion(qIndex)}
                >
                  Delete
                </button>
              </div>

              <input
                type="text"
                style={styles.input}
                value={q.question}
                onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                placeholder="Enter question text..."
              />

              <div style={styles.optionsGrid}>
                {(q.options || ['', '']).map((opt, optIndex) => (
                  <div key={optIndex} style={styles.optionRow}>
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      checked={q.correct_option === optIndex}
                      onChange={() => updateQuestion(qIndex, 'correct_option', optIndex)}
                      style={styles.radio}
                    />
                    <input
                      type="text"
                      style={styles.optionInput}
                      value={opt}
                      onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                      placeholder={`Option ${optIndex + 1}`}
                    />
                    {q.correct_option === optIndex && (
                      <span style={styles.correctBadge}>✓ Correct</span>
                    )}
                    {q.options && q.options.length > 2 && (
                      <button
                        style={styles.removeOptionBtn}
                        onClick={() => {
                          const updated = [...quizQuestions];
                          updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== optIndex);
                          // Adjust correct_option if needed
                          if (updated[qIndex].correct_option === optIndex) {
                            updated[qIndex].correct_option = 0;
                          } else if (updated[qIndex].correct_option > optIndex) {
                            updated[qIndex].correct_option -= 1;
                          }
                          setQuizQuestions(updated);
                          setHasUnsavedChanges(true);
                        }}
                        title="Remove this option"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                style={styles.addOptionBtn}
                onClick={() => {
                  const updated = [...quizQuestions];
                  const currentOptions = updated[qIndex].options || ['', ''];
                  if (currentOptions.length >= 6) {
                    setMessage({ type: 'error', text: 'Maximum 6 options per question' });
                    return;
                  }
                  updated[qIndex].options = [...currentOptions, ''];
                  setQuizQuestions(updated);
                  setHasUnsavedChanges(true);
                }}
              >
                + Add Option
              </button>
            </div>
          ))}

          {quizQuestions.length > 0 && (
            <button
              style={{...styles.saveBtn, opacity: savingQuiz ? 0.6 : 1}}
              onClick={saveQuiz}
              disabled={savingQuiz}
            >
              {savingQuiz ? 'Saving Quiz...' : 'Save Quiz Questions'}
            </button>
          )}
        </div>
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Insert Link</h3>

            <div style={styles.modalField}>
              <label style={styles.modalLabel}>Link Text</label>
              <input
                type="text"
                style={styles.modalInput}
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Enter link text (or select text first)"
                autoFocus
              />
            </div>

            <div style={styles.modalField}>
              <label style={styles.modalLabel}>URL</label>
              <input
                type="text"
                style={styles.modalInput}
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.modalCancelBtn}
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkText('');
                  setLinkUrl('https://');
                }}
              >
                Cancel
              </button>
              <button
                style={styles.modalInsertBtn}
                onClick={handleInsertLink}
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; }

        /* Preview Container Styles - Match day page templates exactly */
        .preview-container {
          min-height: 400px;
          padding: 30px;
          border: 2px solid #3b82f6;
          border-radius: 12px;
          background: #f5f7fa;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #1e293b;
        }

        .preview-container h2 {
          color: #1e293b;
          margin: 30px 0 20px;
          font-size: 1.8em;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .preview-container h3 {
          color: #3b82f6;
          font-size: 1.4em;
          margin: 25px 0 15px;
        }
        .preview-container h4 {
          color: #3b82f6;
          font-size: 1.2em;
          margin: 20px 0 10px;
        }
        .preview-container p {
          margin-bottom: 15px;
          color: #475569;
        }
        .preview-container ul, .preview-container ol {
          margin: 15px 0 15px 25px;
        }
        .preview-container li {
          margin-bottom: 8px;
        }
        .preview-container strong {
          color: #1e293b;
        }

        /* Highlight Box */
        .preview-container .highlight-box {
          background: #f8fafc;
          border: 2px solid #3b82f6;
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.1);
        }

        /* Market Cards Grid */
        .preview-container .market-comparison {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 25px;
          margin: 30px 0;
        }
        .preview-container .market-card {
          background: #f8fafc;
          padding: 25px;
          border-radius: 15px;
          border-left: 5px solid #3b82f6;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        .preview-container .market-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.1);
        }
        .preview-container .market-card h4 {
          color: #3b82f6;
          margin-bottom: 15px;
          font-size: 1.3em;
        }

        /* Market Visual Box */
        .preview-container .market-visual {
          text-align: center;
          margin: 40px 0;
          padding: 30px;
          background: white;
          border-radius: 20px;
          border: 2px solid #3b82f6;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        .preview-container .market-visual h3 {
          color: #3b82f6;
          margin-bottom: 20px;
        }

        /* Market Icons Grid */
        .preview-container .market-icons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .preview-container .market-icon {
          text-align: center;
          padding: 20px;
          background: #f8fafc;
          border-radius: 15px;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }
        .preview-container .market-icon:hover {
          background: #f1f5f9;
          transform: scale(1.05);
          border-color: #3b82f6;
        }
        .preview-container .market-icon span {
          font-size: 2.5em;
          display: block;
          margin-bottom: 10px;
        }
        .preview-container .market-icon h5 {
          color: #1e293b;
          font-weight: 600;
        }

        /* Why Popular Section */
        .preview-container .why-popular {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          padding: 40px;
          border-radius: 20px;
          margin: 40px 0;
        }
        .preview-container .why-popular h2 {
          color: white !important;
          text-align: center;
          margin-bottom: 30px;
        }
        .preview-container .why-popular .market-card {
          background: rgba(255,255,255,0.15);
          color: white;
          border-left-color: white;
        }
        .preview-container .why-popular .market-card h4 {
          color: white !important;
        }
        .preview-container .why-popular .market-card p {
          color: rgba(255,255,255,0.9);
        }

        /* Safety Warning */
        .preview-container .safety-warning {
          background: #fef2f2;
          color: #dc2626;
          padding: 20px;
          border-radius: 10px;
          border-left: 5px solid #dc2626;
          margin: 20px 0;
          font-weight: 600;
        }

        /* Interactive Element */
        .preview-container .interactive-element {
          background: rgba(59, 130, 246, 0.1);
          border: 2px dashed #3b82f6;
          border-radius: 15px;
          padding: 25px;
          margin: 25px 0;
          text-align: center;
        }

        /* Tables */
        .preview-container table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          margin: 20px 0;
        }
        .preview-container thead tr {
          background: linear-gradient(135deg, #1e293b, #475569);
          color: white;
        }
        .preview-container th {
          padding: 18px 15px;
          text-align: left;
          font-weight: 600;
        }
        .preview-container td {
          padding: 16px 15px;
          border-bottom: 1px solid #e2e8f0;
        }
        .preview-container tbody tr:nth-child(even) {
          background: #f8fafc;
        }
        .preview-container tbody tr:hover {
          background: #f1f5f9;
        }

        /* Extra Learning Notes */
        .preview-container .extra-notes {
          background: white;
          padding: 40px;
          border-radius: 20px;
          border-left: 6px solid #3b82f6;
          margin: 40px 0;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }

        /* Sneak Peek */
        .preview-container .sneak-peek {
          background: linear-gradient(135deg, #7c3aed, #5b21b6) !important;
          color: white !important;
          padding: 30px;
          border-radius: 15px;
          margin: 40px 0;
          text-align: center;
        }
        .preview-container .sneak-peek h2,
        .preview-container .sneak-peek p {
          color: white !important;
        }

        /* Completion Section */
        .preview-container .completion-section {
          background: linear-gradient(135deg, #059669, #047857) !important;
          color: white !important;
          padding: 30px;
          border-radius: 15px;
          text-align: center;
          margin: 40px 0;
        }
        .preview-container .completion-section h2,
        .preview-container .completion-section p {
          color: white !important;
        }

        /* Task Section */
        .preview-container .task-section {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          color: #92400e;
          padding: 30px;
          border-radius: 15px;
          border-left: 6px solid #f59e0b;
          margin: 40px 0;
        }
        .preview-container .task-section h2 {
          color: #92400e;
        }

        /* Section Styling */
        .preview-container .section {
          background: white;
          padding: 30px;
          border-radius: 20px;
          margin-bottom: 30px;
          border-left: 6px solid #3b82f6;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }

        /* Rewards Section */
        .preview-container .rewards-section {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          padding: 40px;
          border-radius: 20px;
          margin: 40px 0;
        }
        .preview-container .rewards-section h2 {
          color: white !important;
        }

        /* Visual Editor - Match Template Styling 1:1 */
        .visual-editor h2 {
          color: #1e293b;
          margin: 30px 0 20px;
          font-size: 1.8em;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .visual-editor h3 {
          color: #3b82f6;
          font-size: 1.4em;
          margin: 25px 0 15px;
        }
        .visual-editor h4 {
          color: #3b82f6;
          font-size: 1.2em;
          margin: 20px 0 10px;
        }
        .visual-editor p {
          margin-bottom: 15px;
          color: #475569;
        }
        .visual-editor ul, .visual-editor ol {
          margin: 15px 0 15px 25px;
        }
        .visual-editor li {
          margin-bottom: 8px;
        }
        .visual-editor strong {
          color: #1e293b;
          font-weight: 600;
        }
        .visual-editor a {
          color: #3b82f6;
          text-decoration: underline;
        }
        .visual-editor a:hover {
          color: #1d4ed8;
        }
        .visual-editor table {
          width: 100%;
          border-collapse: collapse;
          margin: 25px 0;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }
        .visual-editor th {
          background: #3b82f6;
          color: white;
          padding: 18px 15px;
          text-align: left;
          font-weight: 600;
        }
        .visual-editor td {
          padding: 16px 15px;
          border-bottom: 1px solid #e2e8f0;
        }
        .visual-editor tbody tr:nth-child(even) {
          background: #f8fafc;
        }
        .visual-editor tbody tr:hover {
          background: #f1f5f9;
        }
        .visual-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          margin: 20px 0;
        }
      `}</style>
    </>
  );
}

const styles = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#64748b',
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  backBtn: {
    background: '#f1f5f9',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#475569',
  },
  title: {
    fontSize: '1.5rem',
    color: '#1e293b',
    margin: 0,
  },
  daySelect: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    cursor: 'pointer',
  },
  importBtn: {
    background: '#f59e0b',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  importAllBtn: {
    background: '#8b5cf6',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  message: {
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontWeight: '500',
  },
  section: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    marginBottom: '20px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    color: '#1e293b',
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#374151',
    fontSize: '14px',
  },
  hint: {
    display: 'block',
    marginTop: '6px',
    color: '#64748b',
    fontSize: '12px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    padding: '10px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderBottom: 'none',
    borderRadius: '8px 8px 0 0',
  },
  toolBtn: {
    padding: '8px 12px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#1e293b',
  },
  toolDivider: {
    padding: '0 4px',
    color: '#cbd5e1',
    display: 'flex',
    alignItems: 'center',
  },
  editor: {
    minHeight: '400px',
    padding: '30px',
    border: '2px solid #3b82f6',
    borderRadius: '0 0 12px 12px',
    fontSize: '15px',
    lineHeight: '1.6',
    outline: 'none',
    background: '#f5f7fa',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: '#1e293b',
  },
  editorModeToggle: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  modeBtn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  htmlEditor: {
    width: '100%',
    minHeight: '500px',
    padding: '16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: 'Monaco, Menlo, Consolas, monospace',
    lineHeight: '1.5',
    resize: 'vertical',
    background: '#1e293b',
    color: '#e2e8f0',
  },
  preview: {
    minHeight: '400px',
    padding: '20px',
    border: '1px solid #e2e8f0',
    borderRadius: '0 0 8px 8px',
    fontSize: '15px',
    lineHeight: '1.7',
    background: '#fafafa',
  },
  saveBtn: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  addBtn: {
    background: '#22c55e',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  questionCard: {
    background: '#f8fafc',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '15px',
    border: '1px solid #e2e8f0',
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  questionNum: {
    fontWeight: '600',
    color: '#667eea',
  },
  deleteBtn: {
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  optionsGrid: {
    marginTop: '15px',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  radio: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  optionInput: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
  },
  correctBadge: {
    background: '#dcfce7',
    color: '#166534',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  addOptionBtn: {
    background: 'transparent',
    color: '#667eea',
    border: '1px dashed #667eea',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    marginTop: '10px',
  },
  removeOptionBtn: {
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    marginLeft: '5px',
  },
  // Link Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  modalContent: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '20px',
  },
  modalField: {
    marginBottom: '20px',
  },
  modalLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569',
    marginBottom: '8px',
  },
  modalInput: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
  },
  modalCancelBtn: {
    padding: '10px 20px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    background: 'white',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  modalInsertBtn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    background: '#3b82f6',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
};
