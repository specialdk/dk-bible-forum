/* ===========================================================================
   Forum-Bible front-end
   Sections:
     1. Element references
     2. Mode switching + status helpers   (existing behaviour)
     3. Rendering results                  (existing behaviour)
     4. Generate + refine + copy           (existing behaviour)
     5. Auth: log in / sign up / log out   (new)
     6. Save + My Studies list             (new)
     7. Startup
   =========================================================================== */

/* ---- 1. Element references ---------------------------------------------- */

// Auth screen
const authScreen = document.getElementById('authScreen');
const authTitle = document.getElementById('authTitle');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authSubmit = document.getElementById('authSubmit');
const authToggle = document.getElementById('authToggle');
const authTogglePrompt = document.getElementById('authTogglePrompt');
const authError = document.getElementById('authError');

// App shell
const appScreen = document.getElementById('appScreen');
const studiesScreen = document.getElementById('studiesScreen');
const userEmail = document.getElementById('userEmail');
const myStudiesBtn = document.getElementById('myStudiesBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Generate UI (existing)
const modeExplainBtn = document.getElementById('modeExplain');
const modeRespondBtn = document.getElementById('modeRespond');
const inputLabel = document.getElementById('inputLabel');
const mainInput = document.getElementById('mainInput');
const inputHint = document.getElementById('inputHint');
const submitBtn = document.getElementById('submitBtn');
const copyBtn = document.getElementById('copyBtn');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const resultTitle = document.getElementById('resultTitle');

const explainResults = document.getElementById('explainResults');
const whatItSays = document.getElementById('whatItSays');
const whyItSaysIt = document.getElementById('whyItSaysIt');
const explainLexicalCard = document.getElementById('explainLexicalCard');
const explainLexicalNote = document.getElementById('explainLexicalNote');
const furtherScriptures = document.getElementById('furtherScriptures');

const respondResults = document.getElementById('respondResults');
const claimSummary = document.getElementById('claimSummary');
const mainIssue = document.getElementById('mainIssue');
const respondLexicalCard = document.getElementById('respondLexicalCard');
const respondLexicalNote = document.getElementById('respondLexicalNote');
const suggestedResponse = document.getElementById('suggestedResponse');
const supportingScriptures = document.getElementById('supportingScriptures');

const authorityReferences = document.getElementById('authorityReferences');
const forumReadyText = document.getElementById('forumReadyText');

// Save + studies (new)
const saveBtn = document.getElementById('saveBtn');
const savedNote = document.getElementById('savedNote');
const refineBtn = document.getElementById('refineBtn');
const studiesBackBtn = document.getElementById('studiesBackBtn');
const studiesList = document.getElementById('studiesList');
const studiesEmpty = document.getElementById('studiesEmpty');

// Passage picker (Explain mode)
const passagePicker = document.getElementById('passagePicker');
const bookSelect = document.getElementById('bookSelect');
const chapterInput = document.getElementById('chapterInput');
const verseInput = document.getElementById('verseInput');

// State
let currentMode = 'explain';
let lastForumText = '';
let authMode = 'login';       // 'login' or 'signup'
let currentStudy = null;      // the study currently shown (so Save knows what to send)
let viewingSavedId = null;    // set when we're looking at an already-saved study

/* ---- 2. Mode switching + status helpers --------------------------------- */

function setMode(mode) {
  currentMode = mode;

  if (!modeExplainBtn || !modeRespondBtn || !inputLabel || !mainInput || !inputHint) return;

  if (mode === 'explain') {
    modeExplainBtn.classList.add('active');
    modeExplainBtn.classList.remove('secondary');
    modeRespondBtn.classList.remove('active');
    modeRespondBtn.classList.add('secondary');

    inputLabel.textContent = 'Scripture reference';
    // Show the Book/Chapter/Verse picker, hide the free-text box.
    if (passagePicker) passagePicker.classList.remove('hidden');
    if (mainInput) mainInput.classList.add('hidden');
    inputHint.textContent =
      'Choose a book and chapter. Leave verse blank to study the whole chapter.';
  } else {
    modeRespondBtn.classList.add('active');
    modeRespondBtn.classList.remove('secondary');
    modeExplainBtn.classList.remove('active');
    modeExplainBtn.classList.add('secondary');

    inputLabel.textContent = 'Comment or claim';
    // Hide the picker, show the free-text box.
    if (passagePicker) passagePicker.classList.add('hidden');
    if (mainInput) mainInput.classList.remove('hidden');
    mainInput.placeholder = 'Paste a comment, claim, or short exchange you want to answer';
    inputHint.textContent =
      'Example: "The church has replaced Israel, so Old Testament promises to Israel now belong only to the church."';
  }
}

// Fill the book dropdown from window.BOOKS (loaded by books.js), default to
// 1 Corinthians so the family's current study is one click away.
function populateBooks() {
  if (!bookSelect || !window.BOOKS) return;
  bookSelect.innerHTML = '';
  window.BOOKS.forEach((b) => {
    const opt = document.createElement('option');
    opt.value = String(b.no);
    opt.textContent = b.name;
    if (b.no === 46) opt.selected = true; // 1 Corinthians
    bookSelect.appendChild(opt);
  });
}

// Read the picker into a reference string ("1 Corinthians 1:18" or
// "1 Corinthians 1") plus the numbers we sort by. Returns null if incomplete.
function readPassage() {
  if (!bookSelect || !window.BOOKS) return null;
  const bookNo = parseInt(bookSelect.value, 10);
  const book = window.BOOKS.find((b) => b.no === bookNo);
  const chapter = parseInt(chapterInput?.value, 10);

  if (!book || !Number.isInteger(chapter) || chapter < 1) return null;

  const verseRaw = parseInt(verseInput?.value, 10);
  const verse = Number.isInteger(verseRaw) && verseRaw >= 1 ? verseRaw : null;

  const reference = verse
    ? `${book.name} ${chapter}:${verse}`
    : `${book.name} ${chapter}`;

  return { reference, book_no: bookNo, chapter, verse: verse ?? 0 };
}

function setStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message || '';
  statusEl.classList.toggle('error', isError);
}

function resetSaveUi() {
  if (saveBtn) saveBtn.style.display = 'none';
  if (savedNote) {
    savedNote.classList.add('hidden');
    savedNote.textContent = '';
  }
}

function clearResults() {
  if (resultsEl) resultsEl.classList.add('hidden');
  if (explainResults) explainResults.classList.add('hidden');
  if (respondResults) respondResults.classList.add('hidden');
  if (explainLexicalCard) explainLexicalCard.classList.add('hidden');
  if (respondLexicalCard) respondLexicalCard.classList.add('hidden');
  if (authorityReferences) authorityReferences.innerHTML = '';
  if (furtherScriptures) furtherScriptures.innerHTML = '';
  if (supportingScriptures) supportingScriptures.innerHTML = '';
  if (forumReadyText) forumReadyText.value = '';
  lastForumText = '';
  if (copyBtn) copyBtn.style.display = 'none';
  resetSaveUi();
}

/* ---- 3. Rendering results ----------------------------------------------- */

function renderScriptureList(container, items) {
  if (!container) return;
  container.innerHTML = '';

  if (!items || items.length === 0) {
    container.innerHTML = '<p>No additional references provided.</p>';
    return;
  }

  const ul = document.createElement('ul');
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  });
  container.appendChild(ul);
}

function renderAuthorities(items) {
  if (!authorityReferences) return;
  authorityReferences.innerHTML = '';

  if (!items || items.length === 0) {
    authorityReferences.innerHTML = '<p>No authority references provided.</p>';
    return;
  }

  items.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'authority-item';
    const strong = document.createElement('strong');
    strong.textContent = item.author || '';
    const work = document.createElement('div');
    work.textContent = item.work || '';
    const note = document.createElement('div');
    note.textContent = item.note || '';
    div.append(strong, work, note);
    authorityReferences.appendChild(div);
  });
}

function renderExplain(data) {
  if (resultTitle) resultTitle.textContent = data.title || 'Explanation';
  if (whatItSays) whatItSays.textContent = data.whatItSays || '';
  if (whyItSaysIt) whyItSaysIt.textContent = data.whyItSaysIt || '';

  if (data.lexicalNote && data.lexicalNote.trim()) {
    if (explainLexicalNote) explainLexicalNote.textContent = data.lexicalNote;
    if (explainLexicalCard) explainLexicalCard.classList.remove('hidden');
  } else {
    if (explainLexicalNote) explainLexicalNote.textContent = '';
    if (explainLexicalCard) explainLexicalCard.classList.add('hidden');
  }

  renderScriptureList(furtherScriptures, data.furtherScriptures || []);
  renderAuthorities(data.authorityReferences || []);
  if (forumReadyText) forumReadyText.value = data.forumReadyText || '';

  if (explainResults) explainResults.classList.remove('hidden');
  if (respondResults) respondResults.classList.add('hidden');
  if (resultsEl) resultsEl.classList.remove('hidden');

  lastForumText = data.forumReadyText || '';
}

function renderRespond(data) {
  if (resultTitle) resultTitle.textContent = data.title || 'Response';
  if (claimSummary) claimSummary.textContent = data.claimSummary || '';
  if (mainIssue) mainIssue.textContent = data.mainIssue || '';
  if (suggestedResponse) suggestedResponse.textContent = data.suggestedResponse || '';

  if (data.lexicalNote && data.lexicalNote.trim()) {
    if (respondLexicalNote) respondLexicalNote.textContent = data.lexicalNote;
    if (respondLexicalCard) respondLexicalCard.classList.remove('hidden');
  } else {
    if (respondLexicalNote) respondLexicalNote.textContent = '';
    if (respondLexicalCard) respondLexicalCard.classList.add('hidden');
  }

  renderScriptureList(supportingScriptures, data.supportingScriptures || []);
  renderAuthorities(data.authorityReferences || []);
  if (forumReadyText) forumReadyText.value = data.forumReadyText || '';

  if (respondResults) respondResults.classList.remove('hidden');
  if (explainResults) explainResults.classList.add('hidden');
  if (resultsEl) resultsEl.classList.remove('hidden');

  lastForumText = data.forumReadyText || '';
}

function renderResult(mode, data) {
  if (mode === 'explain') renderExplain(data);
  else renderRespond(data);
}

/* ---- 4. Generate + refine + copy ---------------------------------------- */

async function generate() {
  // Build the input differently per mode: picker for Explain, text for Respond.
  let input;
  let passage = null;

  if (currentMode === 'explain') {
    passage = readPassage();
    if (!passage) {
      setStatus('Please choose a book and chapter.', true);
      clearResults();
      return;
    }
    input = passage.reference;
  } else {
    if (!mainInput) return;
    input = mainInput.value.trim();
    if (!input) {
      setStatus('Please enter some text first.', true);
      clearResults();
      return;
    }
  }

  setStatus('Working...');
  clearResults();
  if (submitBtn) submitBtn.disabled = true;

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: currentMode, input })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Something went wrong.');

    renderResult(currentMode, data);

    // Remember this result so the Save button knows what to store.
    // In Explain mode we also carry the Bible-order numbers.
    currentStudy = {
      mode: currentMode,
      title: data.title || '',
      source_input: input,
      details: data,
      book_no: passage ? passage.book_no : null,
      chapter: passage ? passage.chapter : null,
      verse: passage ? passage.verse : null
    };
    viewingSavedId = null;

    setStatus('Done.');
    if (copyBtn) copyBtn.style.display = 'inline-flex';
    if (saveBtn) saveBtn.style.display = 'inline-flex';
    if (savedNote) savedNote.classList.add('hidden');
  } catch (error) {
    setStatus(error.message || 'Generation failed.', true);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function copyText() {
  if (!forumReadyText) return;
  const text = forumReadyText.value;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    const original = copyBtn.textContent;
    copyBtn.textContent = 'Copied';
    setTimeout(() => { copyBtn.textContent = original; }, 1200);
  } catch {
    setStatus('Could not copy text.', true);
  }
}

async function refineText() {
  const text = forumReadyText.value;
  if (!text) return;

  setStatus('Refining...');
  try {
    const response = await fetch('/api/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await response.json();
    forumReadyText.value = data.refinedText;
    if (currentStudy && currentStudy.details) {
      currentStudy.details.forumReadyText = data.refinedText;
    }
    setStatus('Refined.');
  } catch {
    setStatus('Refine failed.', true);
  }
}

/* ---- 5. Auth: log in / sign up / log out -------------------------------- */

function showScreen(name) {
  if (authScreen) authScreen.classList.toggle('hidden', name !== 'auth');
  if (appScreen) appScreen.classList.toggle('hidden', name !== 'app');
  if (studiesScreen) studiesScreen.classList.toggle('hidden', name !== 'studies');
}

function setAuthMode(mode) {
  authMode = mode;
  if (authError) authError.textContent = '';
  if (mode === 'login') {
    if (authTitle) authTitle.textContent = 'Log in';
    if (authSubmit) authSubmit.textContent = 'Log in';
    if (authTogglePrompt) authTogglePrompt.textContent = 'No account yet?';
    if (authToggle) authToggle.textContent = 'Create one';
    if (authPassword) authPassword.setAttribute('autocomplete', 'current-password');
  } else {
    if (authTitle) authTitle.textContent = 'Create account';
    if (authSubmit) authSubmit.textContent = 'Sign up';
    if (authTogglePrompt) authTogglePrompt.textContent = 'Already have an account?';
    if (authToggle) authToggle.textContent = 'Log in';
    if (authPassword) authPassword.setAttribute('autocomplete', 'new-password');
  }
}

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.user) {
      showLoggedIn(data.user);
    } else {
      showScreen('auth');
    }
  } catch {
    showScreen('auth');
  }
}

function showLoggedIn(user) {
  if (userEmail) userEmail.textContent = user.email || '';
  showScreen('app');
}

async function submitAuth() {
  const email = (authEmail?.value || '').trim();
  const password = authPassword?.value || '';

  if (!email || !password) {
    if (authError) authError.textContent = 'Please enter your email and password.';
    return;
  }

  const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
  if (authSubmit) authSubmit.disabled = true;
  if (authError) authError.textContent = '';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not sign in.');

    if (authPassword) authPassword.value = '';
    showLoggedIn(data);
  } catch (err) {
    if (authError) authError.textContent = err.message || 'Could not sign in.';
  } finally {
    if (authSubmit) authSubmit.disabled = false;
  }
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    /* ignore */
  }
  currentStudy = null;
  viewingSavedId = null;
  clearResults();
  setStatus('');
  if (authEmail) authEmail.value = '';
  setAuthMode('login');
  showScreen('auth');
}

/* ---- 6. Save + My Studies list ------------------------------------------ */

async function saveStudy() {
  if (!currentStudy) return;

  if (saveBtn) saveBtn.disabled = true;
  try {
    const res = await fetch('/api/studies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: currentStudy.mode,
        title: currentStudy.title,
        source_input: currentStudy.source_input,
        details: currentStudy.details,
        book_no: currentStudy.book_no,
        chapter: currentStudy.chapter,
        verse: currentStudy.verse
      })
    });
    const data = await res.json();

    if (res.status === 401) { showScreen('auth'); return; }
    if (!res.ok) throw new Error(data.error || 'Could not save.');

    if (saveBtn) saveBtn.style.display = 'none';
    if (savedNote) {
      savedNote.textContent = 'Saved to My Studies';
      savedNote.classList.remove('hidden');
    }
  } catch (err) {
    setStatus(err.message || 'Could not save the study.', true);
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch {
    return '';
  }
}

async function openStudies() {
  if (studiesList) studiesList.innerHTML = '';
  if (studiesEmpty) studiesEmpty.classList.add('hidden');
  showScreen('studies');

  try {
    const res = await fetch('/api/studies');
    if (res.status === 401) { showScreen('auth'); return; }
    const items = await res.json();
    renderStudiesList(items || []);
  } catch {
    if (studiesList) studiesList.innerHTML = '<p class="error">Could not load your studies.</p>';
  }
}

function renderStudiesList(items) {
  if (!studiesList) return;
  studiesList.innerHTML = '';

  if (items.length === 0) {
    if (studiesEmpty) studiesEmpty.classList.remove('hidden');
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'card study-item';

    const top = document.createElement('div');
    top.className = 'study-top';

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = item.mode === 'explain' ? 'Explanation' : 'Response';

    const date = document.createElement('span');
    date.className = 'study-date';
    date.textContent = formatDate(item.created_at);

    top.append(badge, date);

    const title = document.createElement('h3');
    title.className = 'study-title';
    title.textContent = item.title || item.source_input || 'Untitled study';

    const source = document.createElement('p');
    source.className = 'study-source';
    // For passage studies, show the reference (e.g. "1 Corinthians 1:18").
    // For Respond studies, show the start of the comment.
    source.textContent = item.source_input || '';

    const actions = document.createElement('div');
    actions.className = 'study-actions';

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.textContent = 'Open';
    openBtn.addEventListener('click', () => openStudy(item.id));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'secondary';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => deleteStudy(item.id, card));

    actions.append(openBtn, delBtn);
    card.append(top, title, source, actions);
    studiesList.appendChild(card);
  });
}

async function openStudy(id) {
  try {
    const res = await fetch(`/api/studies/${id}`);
    if (res.status === 401) { showScreen('auth'); return; }
    const study = await res.json();
    if (!res.ok) throw new Error(study.error || 'Could not open that study.');

    setMode(study.mode);
    renderResult(study.mode, study.details);

    currentStudy = null;          // already saved; don't offer to save again
    viewingSavedId = study.id;
    if (saveBtn) saveBtn.style.display = 'none';
    if (savedNote) {
      savedNote.textContent = 'Saved ' + formatDate(study.created_at);
      savedNote.classList.remove('hidden');
    }
    if (copyBtn) copyBtn.style.display = 'inline-flex';

    showScreen('app');
    setStatus('');
  } catch (err) {
    setStatus(err.message || 'Could not open that study.', true);
  }
}

async function deleteStudy(id, cardEl) {
  if (!confirm('Delete this study? This cannot be undone.')) return;

  try {
    const res = await fetch(`/api/studies/${id}`, { method: 'DELETE' });
    if (res.status === 401) { showScreen('auth'); return; }
    if (!res.ok) throw new Error('Could not delete.');
    if (cardEl) cardEl.remove();
    if (studiesList && studiesList.children.length === 0 && studiesEmpty) {
      studiesEmpty.classList.remove('hidden');
    }
  } catch {
    setStatus('Could not delete the study.', true);
  }
}

/* ---- 7. Startup --------------------------------------------------------- */

if (modeExplainBtn) modeExplainBtn.addEventListener('click', () => setMode('explain'));
if (modeRespondBtn) modeRespondBtn.addEventListener('click', () => setMode('respond'));
if (submitBtn) submitBtn.addEventListener('click', generate);
if (copyBtn) copyBtn.addEventListener('click', copyText);
if (refineBtn) refineBtn.addEventListener('click', refineText);
if (saveBtn) saveBtn.addEventListener('click', saveStudy);

if (mainInput) {
  mainInput.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') generate();
  });
}

if (authSubmit) authSubmit.addEventListener('click', submitAuth);
if (authToggle) {
  authToggle.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthMode(authMode === 'login' ? 'signup' : 'login');
  });
}
if (authPassword) {
  authPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitAuth();
  });
}
if (myStudiesBtn) myStudiesBtn.addEventListener('click', openStudies);
if (logoutBtn) logoutBtn.addEventListener('click', logout);
if (studiesBackBtn) studiesBackBtn.addEventListener('click', () => showScreen('app'));

populateBooks();
setMode('explain');
setAuthMode('login');
resetSaveUi();
if (copyBtn) copyBtn.style.display = 'none';
checkAuth();