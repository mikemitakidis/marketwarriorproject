import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getSupabaseClient } from '../../../lib/supabase';

export default function ContentEditor() {
  const router = useRouter();
  const { day } = router.query;
  const editorRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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

  useEffect(() => {
    if (day) {
      checkAdminAndLoad();
    }
  }, [day]);

  async function checkAdminAndLoad() {
    try {
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
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
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
      setHtmlContent(editorRef.current.innerHTML);
    }
  }

  function insertHeading() {
    execCommand('formatBlock', 'h3');
  }

  function insertParagraph() {
    execCommand('formatBlock', 'p');
  }

  function insertLink() {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
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
      { id: null, question: '', options: ['', '', '', ''], correct_option: 0, isNew: true }
    ]);
  }

  function updateQuestion(index, field, value) {
    const updated = [...quizQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setQuizQuestions(updated);
  }

  function updateOption(qIndex, optIndex, value) {
    const updated = [...quizQuestions];
    updated[qIndex].options[optIndex] = value;
    setQuizQuestions(updated);
  }

  function removeQuestion(index) {
    if (!confirm('Delete this question?')) return;
    const q = quizQuestions[index];
    if (q.id && !q.isNew) {
      // Delete from database
      fetch('/api/admin/quiz', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: q.id }),
      });
    }
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
  }

  async function saveQuiz() {
    setSavingQuiz(true);
    setMessage({ type: '', text: '' });

    try {
      for (const q of quizQuestions) {
        if (!q.question.trim()) continue;

        if (q.isNew || !q.id) {
          // Create new question
          await fetch('/api/admin/quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              day: parseInt(day),
              question: q.question,
              options: q.options.filter(o => o.trim()),
              correct_option: q.correct_option,
            }),
          });
        } else {
          // Update existing
          await fetch('/api/admin/quiz', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              id: q.id,
              question: q.question,
              options: q.options.filter(o => o.trim()),
              correct_option: q.correct_option,
            }),
          });
        }
      }

      setMessage({ type: 'success', text: 'Quiz saved successfully!' });
      loadContent(); // Reload to get updated IDs
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
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
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Introduction to Trading"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>YouTube Video URL</label>
            <input
              type="text"
              style={styles.input}
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="e.g., https://www.youtube.com/embed/VIDEO_ID"
            />
            <small style={styles.hint}>Use embed URL format: https://www.youtube.com/embed/VIDEO_ID</small>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Lesson Content</label>

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
              <span style={styles.toolDivider}>|</span>
              <button
                type="button"
                style={{...styles.toolBtn, background: showPreview ? '#667eea' : '#f1f5f9', color: showPreview ? 'white' : '#1e293b'}}
                onClick={() => setShowPreview(!showPreview)}
              >
                👁️ Preview
              </button>
            </div>

            {showPreview ? (
              <div style={styles.preview} dangerouslySetInnerHTML={{ __html: htmlContent }} />
            ) : (
              <div
                ref={editorRef}
                contentEditable
                style={styles.editor}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
                onInput={updateHtmlContent}
                onBlur={updateHtmlContent}
              />
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Daily Task Prompt</label>
            <textarea
              style={styles.textarea}
              value={taskPrompt}
              onChange={(e) => setTaskPrompt(e.target.value)}
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
                {(q.options || ['', '', '', '']).map((opt, optIndex) => (
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
                  </div>
                ))}
              </div>

              <button
                style={styles.addOptionBtn}
                onClick={() => {
                  const updated = [...quizQuestions];
                  updated[qIndex].options = [...(updated[qIndex].options || []), ''];
                  setQuizQuestions(updated);
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

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; }
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
    padding: '20px',
    border: '1px solid #e2e8f0',
    borderRadius: '0 0 8px 8px',
    fontSize: '15px',
    lineHeight: '1.7',
    outline: 'none',
    background: 'white',
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
};
