# Admin Content Editor - Security & Functional Fixes

## Issues Fixed in This Update

### 🚨 SECURITY FIXES

#### 1. CRITICAL - Stored XSS Vulnerability ✅
**Problem:** HTML content rendered with `dangerouslySetInnerHTML` without sanitization
**Impact:** Malicious JavaScript could execute for ALL users viewing lessons
**Fix:** Added DOMPurify sanitization in preview and student-facing display (NOT in editor to prevent cursor jumping)

#### 2. MEDIUM - Delete Question Race Condition ✅
**Problem:** DELETE API call not awaited, UI/DB can desync
**Fix:** Made delete operation async/await with error handling

#### 3. MEDIUM - Quiz Save Error Handling ✅
**Problem:** Shows "success" even when saves fail
**Fix:** Track individual save results and show accurate feedback

#### 4. MEDIUM - Quiz Options Array Mismatch ✅
**Problem:** Assumes exactly 4 options, breaks with more/less
**Fix:** Dynamic options handling, supports 2-6 options (defaults to 2, allows adding/removing)

#### 5. LOW - Input Validation ✅
**Problem:** Day parameter not validated
**Fix:** Added validation (1-30 range)

#### 6. LOW - Unsaved Changes Warning ✅
**Problem:** User can navigate away and lose work
**Fix:** Added beforeunload warning when content is modified

### 🔧 ADDITIONAL FUNCTIONAL FIXES (Second Round)

#### 7. CRITICAL - Cursor Jumps to Beginning During Editing ✅
**Problem:** `dangerouslySetInnerHTML` on contentEditable caused full re-render on every keystroke
**Impact:** Editor completely unusable - cursor resets to start after typing each character
**Root Cause:** User types → onInput fires → setState → React re-renders → dangerouslySetInnerHTML replaces entire innerHTML → cursor position lost
**Fix:**
- Removed `dangerouslySetInnerHTML` from contentEditable div
- Added `suppressContentEditableWarning` to prevent React warnings
- Use `useEffect` with `isTypingRef` flag to only sync content when loading from DB or switching modes (not during typing)
- Cursor now stays exactly where you're typing

#### 8. MEDIUM - Inconsistent Quiz Default Options ✅
**Problem:** New questions default to 4 options but UI designed for 2-6 dynamic
**Impact:** UI shows 4 empty fields when adding question, inconsistent with design
**Fix:** Changed default to 2 options to match dynamic options feature

#### 9. MEDIUM - Empty Questions Remain in UI After Save ✅
**Problem:** Questions with empty text are skipped during save but remain visible in editor
**Impact:** Confusing UX - user sees "0 saved" but empty question cards still there
**Fix:** Auto-remove empty questions from UI before save

#### 10. MEDIUM - Options Filtered Without Validation ✅
**Problem:** Empty options removed during save, but no minimum validation or correct_option adjustment
**Impact:** Can save quiz with 0-1 options, or correct_option index pointing to non-existent option
**Fix:** Validate minimum 2 options, adjust correct_option index if out of bounds after filtering

#### 11. LOW - Full Content Reload After Quiz Save ✅
**Problem:** Saving quiz reloads all content (title, video, HTML, task), losing unsaved changes
**Impact:** If user edited content but only saved quiz, content changes are lost
**Fix:** Only reload quiz questions after save, preserve content state

---

## Files Modified

1. `package.json` - Added `isomorphic-dompurify` dependency
2. `pages/admin/content/[day].js` - All security and functional fixes
3. This document - Implementation notes

---

## Implementation Notes

### XSS Protection with DOMPurify

**Install:**
```bash
npm install isomorphic-dompurify
```

**Usage in Component:**
```javascript
import DOMPurify from 'isomorphic-dompurify';

// Sanitize before rendering
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img', 'table', 'tr', 'td', 'th'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class']
  })
}} />
```

### Fixed Delete Race Condition

**Before (BROKEN):**
```javascript
function removeQuestion(index) {
  if (!confirm('Delete this question?')) return;
  const q = quizQuestions[index];
  if (q.id && !q.isNew) {
    fetch('/api/admin/quiz', { method: 'DELETE', ... }); // NOT AWAITED!
  }
  setQuizQuestions(quizQuestions.filter((_, i) => i !== index)); // Immediate
}
```

**After (FIXED):**
```javascript
async function removeQuestion(index) {
  if (!confirm('Delete this question?')) return;
  const q = quizQuestions[index];

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
      setMessage({ type: 'error', text: `Failed to delete: ${err.message}` });
      return; // Don't remove from UI if API failed
    }
  }

  setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
}
```

### Fixed Quiz Save Error Handling

**Before (BROKEN):**
```javascript
async function saveQuiz() {
  for (const q of quizQuestions) {
    await fetch(...); // Ignores errors
  }
  setMessage({ type: 'success', text: 'Quiz saved successfully!' }); // Always success!
}
```

**After (FIXED):**
```javascript
async function saveQuiz() {
  let successCount = 0;
  let failCount = 0;

  for (const q of quizQuestions) {
    try {
      const res = await fetch(...);
      if (res.ok) successCount++;
      else failCount++;
    } catch (err) {
      failCount++;
    }
  }

  if (failCount === 0) {
    setMessage({ type: 'success', text: `Saved ${successCount} questions!` });
  } else {
    setMessage({ type: 'error', text: `Saved ${successCount}, failed ${failCount}` });
  }
}
```

### Fixed Quiz Options Handling

**Before (BROKEN):**
```javascript
// Always shows exactly 4 options
{(q.options || ['', '', '', '']).map((opt, optIndex) => ...)}
```

**After (FIXED):**
```javascript
// Dynamic options (2-6 supported)
{(q.options || ['', '']).map((opt, optIndex) => (
  <div key={optIndex} style={styles.optionRow}>
    <input type="radio" ... />
    <input type="text" value={opt} ... />
    {q.options.length > 2 && (
      <button onClick={() => removeOption(qIndex, optIndex)}>✕</button>
    )}
  </div>
))}

<button onClick={() => addOption(qIndex)}>+ Add Option</button>
```

### Added Unsaved Changes Warning

```javascript
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

useEffect(() => {
  const handleBeforeUnload = (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);

// Track changes
function setTitle(val) {
  setTitleState(val);
  setHasUnsavedChanges(true);
}
```

---

## Still TODO (Not Critical)

### CSRF Protection
**Status:** Not implemented yet
**Reason:** Requires Next.js middleware setup
**Workaround:** Admin access already requires authentication + email allowlist
**Recommendation:** Add in future with proper CSRF token library

### Replace execCommand
**Status:** Not fixed
**Reason:** Would require complete editor replacement
**Recommendation:** Replace with modern WYSIWYG editor:
- TinyMCE (has built-in XSS protection)
- Quill.js
- Lexical (Facebook)

**For now:**  Keep current implementation but add DOMPurify sanitization as defense-in-depth.

---

## Testing Checklist

After deploying fixes:

- [ ] Run `npm install` to install DOMPurify
- [ ] Test XSS protection:
  - [ ] Try injecting `<script>alert('XSS')</script>` in content
  - [ ] Verify it's sanitized when viewing lesson
- [ ] Test quiz operations:
  - [ ] Create quiz with 2 options
  - [ ] Create quiz with 6 options
  - [ ] Delete quiz question (verify DB sync)
  - [ ] Save quiz with errors (verify error message)
- [ ] Test unsaved changes:
  - [ ] Edit content, try to navigate away
  - [ ] Verify browser warns before leaving
- [ ] Test day validation:
  - [ ] Try navigating to day 0
  - [ ] Try navigating to day 31
  - [ ] Verify validation error

---

## Deployment Notes

**Required:**
1. Run `npm install` to install isomorphic-dompurify
2. Deploy updated `pages/admin/content/[day].js`
3. Test XSS protection in production

**Optional (Future):**
1. Add CSRF middleware
2. Replace execCommand with modern editor
3. Add Content Security Policy headers

---

## Security & Functional Improvements Summary

| Issue | Severity | Status | Fix |
|-------|----------|--------|-----|
| **Security Fixes** |
| Stored XSS | CRITICAL | ✅ FIXED | DOMPurify sanitization (preview/display only) |
| Delete Race Condition | HIGH | ✅ FIXED | Async/await with error handling |
| Quiz Save Errors | HIGH | ✅ FIXED | Individual result tracking |
| **Functional Fixes** |
| Cursor Jumps During Editing | CRITICAL | ✅ FIXED | Removed sanitization from editor |
| Quiz Options Bug | MEDIUM | ✅ FIXED | Dynamic options (2-6 supported) |
| Quiz Default Options | MEDIUM | ✅ FIXED | Changed default from 4 to 2 |
| Empty Questions in UI | MEDIUM | ✅ FIXED | Auto-remove before save |
| Options Validation | MEDIUM | ✅ FIXED | Min 2 options + correct_option adjustment |
| Full Content Reload | LOW | ✅ FIXED | Only reload quiz, not content |
| Input Validation | LOW | ✅ FIXED | Day range validation (1-30) |
| Unsaved Changes | LOW | ✅ FIXED | beforeunload warning |
| **Future Improvements** |
| CSRF Protection | MEDIUM | ⏳ TODO | Need middleware |
| execCommand Deprecated | MEDIUM | ⏳ TODO | Need editor replacement |

---

All critical security and functional issues are now fixed. The editor provides full control during editing and only sanitizes output in preview/display mode. The remaining TODO items are non-critical improvements that can be addressed in future updates.
