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

let currentMode = 'explain';
let lastForumText = '';

function setMode(mode) {
  currentMode = mode;

  if (!modeExplainBtn || !modeRespondBtn || !inputLabel || !mainInput || !inputHint) {
    return;
  }

  if (mode === 'explain') {
    modeExplainBtn.classList.add('active');
    modeExplainBtn.classList.remove('secondary');
    modeRespondBtn.classList.remove('active');
    modeRespondBtn.classList.add('secondary');

    inputLabel.textContent = 'Scripture reference';
    mainInput.placeholder = 'e.g. Hebrews 2:14-18 or Matthew 12';
    inputHint.textContent =
      'Example references: Hebrews 1, Psalm 102, Matthew 12:22-32, 1 Thessalonians 4:17';
  } else {
    modeRespondBtn.classList.add('active');
    modeRespondBtn.classList.remove('secondary');
    modeExplainBtn.classList.remove('active');
    modeExplainBtn.classList.add('secondary');

    inputLabel.textContent = 'Comment or claim';
    mainInput.placeholder = 'Paste a comment, claim, or short exchange you want to answer';
    inputHint.textContent =
      'Example: "The church has replaced Israel, so Old Testament promises to Israel now belong only to the church."';
  }
}

function setStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message || '';
  statusEl.classList.toggle('error', isError);
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
  if (forumReadyText) forumReadyText.textContent = '';
  lastForumText = '';
  if (copyBtn) copyBtn.style.display = 'none';
}

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
    div.innerHTML = `
      <strong>${item.author}</strong>
      <div>${item.work}</div>
      <div>${item.note}</div>
    `;
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

async function generate() {
  if (!mainInput) return;

  const input = mainInput.value.trim();

  if (!input) {
    setStatus('Please enter some text first.', true);
    clearResults();
    return;
  }

  setStatus('Working...');
  clearResults();
  if (submitBtn) submitBtn.disabled = true;

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: currentMode,
        input
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong.');
    }

    if (currentMode === 'explain') {
      renderExplain(data);
    } else {
      renderRespond(data);
    }

    setStatus('Done.');
    if (copyBtn) copyBtn.style.display = 'inline-flex';
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
    setTimeout(() => {
      copyBtn.textContent = original;
    }, 1200);
  } catch {
    setStatus('Could not copy text.', true);
  }
}

if (modeExplainBtn) {
  modeExplainBtn.addEventListener('click', () => setMode('explain'));
}

if (modeRespondBtn) {
  modeRespondBtn.addEventListener('click', () => setMode('respond'));
}

if (submitBtn) {
  submitBtn.addEventListener('click', generate);
}

if (copyBtn) {
  copyBtn.addEventListener('click', copyText);
}

if (mainInput) {
  mainInput.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      generate();
    }
  });
}

setMode('explain');
if (copyBtn) copyBtn.style.display = 'none';

const refineBtn = document.getElementById('refineBtn');

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

    setStatus('Refined.');
  } catch (err) {
    setStatus('Refine failed.', true);
  }
}

refineBtn.addEventListener('click', refineText);