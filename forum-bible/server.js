import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const model = process.env.MODEL || 'gpt-5.4';

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY is not set. API requests will fail until it is provided.');
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sharedPerspective = `
You are helping a Bible student produce concise, forum-ready material from a consistent theological perspective.

Core perspective to follow:
- Use a literal, grammatical, historical reading unless the text clearly signals symbolism.
- Keep the tone reverent, plain, readable, and useful for ordinary readers.
- Prefer a Jewish dispensational understanding.
- Preserve distinctions where appropriate between Israel, the Church, the Kingdom, and Messiah's program.
- Consider what the text meant to the original hearers before moving to application.
- Avoid flattening prophetic passages into vague generalities.
- Honour the text first, system second.
- Where relevant, note whether a passage is doctrinal, historical, prophetic, devotional, or transitional.
- When citing outside voices, prefer Arnold Fruchtenbaum whenever relevant.
- Chuck Missler, John Walvoord, J. Dwight Pentecost, Charles Ryrie, Lewis Sperry Chafer, Alva J. McClain, and careful conservative commentators are also welcome.
- Do not pretend a source said something exact unless you are reasonably confident. If uncertain, present a careful paraphrase.
- Do not be argumentative for its own sake. Aim to clarify truth and help readers.
- Keep the output short enough to be useful in a forum.
- Use plain English, not academic padding.
- Where a key biblical word materially strengthens the explanation, include a short lexical note, but only if it genuinely helps.
- A lexical note must stay brief, practical, and directly tied to the argument.
`;

const explainSchema = {
  type: 'json_schema',
  name: 'forum_bible_explain_response',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      mode: { type: 'string' },
      title: { type: 'string' },
      whatItSays: { type: 'string' },
      whyItSaysIt: { type: 'string' },
      lexicalNote: { type: 'string' },
      authorityReferences: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            author: { type: 'string' },
            work: { type: 'string' },
            note: { type: 'string' }
          },
          required: ['author', 'work', 'note']
        }
      },
      furtherScriptures: {
        type: 'array',
        items: { type: 'string' }
      },
      forumReadyText: { type: 'string' }
    },
    required: [
      'mode',
      'title',
      'whatItSays',
      'whyItSaysIt',
      'lexicalNote',
      'authorityReferences',
      'furtherScriptures',
      'forumReadyText'
    ]
  }
};

const respondSchema = {
  type: 'json_schema',
  name: 'forum_bible_respond_response',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      mode: { type: 'string' },
      title: { type: 'string' },
      claimSummary: { type: 'string' },
      mainIssue: { type: 'string' },
      lexicalNote: { type: 'string' },
      suggestedResponse: { type: 'string' },
      supportingScriptures: {
        type: 'array',
        items: { type: 'string' }
      },
      authorityReferences: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            author: { type: 'string' },
            work: { type: 'string' },
            note: { type: 'string' }
          },
          required: ['author', 'work', 'note']
        }
      },
      forumReadyText: { type: 'string' }
    },
    required: [
      'mode',
      'title',
      'claimSummary',
      'mainIssue',
      'lexicalNote',
      'suggestedResponse',
      'supportingScriptures',
      'authorityReferences',
      'forumReadyText'
    ]
  }
};

const refineSchema = {
  type: 'json_schema',
  name: 'forum_bible_refine_response',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      refinedText: { type: 'string' }
    },
    required: ['refinedText']
  }
};

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate', async (req, res) => {
  try {
    const { mode, input } = req.body ?? {};

    if (!mode || typeof mode !== 'string') {
      return res.status(400).json({ error: 'Please choose a mode.' });
    }

    if (!input || typeof input !== 'string' || !input.trim()) {
      return res.status(400).json({ error: 'Please enter your text.' });
    }

    const cleanInput = input.trim();
    let instructions = sharedPerspective;
    let prompt = '';
    let schema = explainSchema;

    if (mode === 'explain') {
      instructions += `
Task type: Explain a scripture passage.

Response rules:
- The user enters a scripture reference such as "Hebrews 2:14-18" or "Matthew 12".
- Return a plain-English explanation suitable for a forum.
- Keep "What it says" to about 70-120 words.
- Keep "Why it says it" to about 70-120 words.
- Make "Why it says it" purpose-driven, not vague.
- Keep the explanation clear enough for ordinary readers.
- If a key biblical word genuinely helps, include a short lexical note of 1-3 sentences. Otherwise return an empty string for lexicalNote.
- Give exactly 3 authority references with short notes.
- Put Arnold Fruchtenbaum first whenever reasonably relevant.
- Prefer conservative dispensational authorities where relevant.
- Include further scriptures only when they genuinely help.
- Build a final forumReadyText block that is concise, calm, easy to paste into a forum, and written in plain language.
- Avoid over-academic language.
- Avoid unnecessary hedging.
- Return valid JSON only.
`;

      prompt = `
Scripture reference: ${cleanInput}

Create a concise, clear explanation of this passage from the stated perspective.
`;
      schema = explainSchema;
    } else if (mode === 'respond') {
      instructions += `
Task type: Respond to someone else's theological comment or claim.

Response rules:
- First summarise the claim fairly in 1-3 sentences.
- Then identify the main issue briefly and clearly.
- The main issue should expose the core weakness, false assumption, confusion of categories, flattening of distinctions, or contradiction in the claim.
- Draft a concise response in plain English from the stated perspective.
- The response should be calm, reasoned, scriptural, and helpful to readers following the discussion.
- Avoid sarcasm, point-scoring, caricature, and unnecessary aggression.
- Keep the suggestedResponse to about 140-240 words.
- If a key biblical word genuinely strengthens the response, include a short lexical note of 1-3 sentences. Otherwise return an empty string for lexicalNote.
- A lexical note may mention meaning and the pattern of usage, but must not become a long word study.
- When helpful, expose internal contradictions gently and clearly.
- When helpful, point out that one passage should not be forced to cancel the plain sense of another.
- Give exactly 3 authority references with short notes.
- Put Arnold Fruchtenbaum first whenever reasonably relevant.
- Include supporting scriptures that genuinely strengthen the reply.
- Build a final forumReadyText block that reads like a ready-to-post reply.
- The forumReadyText should be shorter and smoother than the suggestedResponse.
- Return valid JSON only.
`;

      prompt = `
Comment or claim to address:
${cleanInput}

Create a concise, helpful response from the stated perspective.
`;
      schema = respondSchema;
    } else {
      return res.status(400).json({ error: 'Invalid mode selected.' });
    }

    const response = await client.responses.create({
      model,
      instructions,
      input: prompt,
      text: {
        format: schema
      }
    });

    const parsed = JSON.parse(response.output_text);
    return res.json(parsed);
  } catch (error) {
    console.error('Generation failed:', error);
    const message = error?.message || 'Something went wrong while generating the response.';
    return res.status(500).json({ error: message });
  }
});

app.post('/api/refine', async (req, res) => {
  try {
    const { text } = req.body ?? {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Please enter some text to refine.' });
    }

    const instructions = `
You are refining a forum reply written from a careful Jewish dispensational perspective.

Rules:
- Do NOT change the theology or argument.
- Do NOT add new ideas.
- Do NOT remove important scriptural distinctions.
- Improve clarity, flow, readability, and force of wording.
- Keep the tone calm, respectful, confident, and suitable for a public Christian discussion forum.
- Tighten phrasing where possible.
- Keep it plain and natural, not academic.
- Return valid JSON only.
`;

    const prompt = `
Refine the following forum reply without changing its meaning:

${text.trim()}
`;

    const response = await client.responses.create({
      model,
      instructions,
      input: prompt,
      text: {
        format: refineSchema
      }
    });

    const parsed = JSON.parse(response.output_text);
    return res.json(parsed);
  } catch (error) {
    console.error('Refine failed:', error);
    const message = error?.message || 'Something went wrong while refining the response.';
    return res.status(500).json({ error: message });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'Forum-Bible' });
});

app.listen(port, () => {
  console.log(`Forum-Bible running on port ${port}`);
});