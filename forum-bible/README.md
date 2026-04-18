# Forum-Bible

Forum-Bible is a simple scripture note app that lets you enter a Bible reference and receive:

- a short **What it says** summary
- a short **Why it says it** explanation
- **3 authority references**
- **further scriptures** when helpful
- a **copyable forum-ready text block**

## Stack

- Node.js
- Express
- OpenAI API
- Plain HTML, CSS, JavaScript

## Local setup

1. Open the project in Visual Studio Code.
2. Run:

```bash
npm install
```

3. Copy `.env.example` to `.env`
4. Add your OpenAI API key:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
MODEL=gpt-5.4
```

5. Start the app:

```bash
npm run dev
```

6. Open:

```text
http://localhost:3000
```

## Railway deployment

1. Push the folder to a GitHub repository.
2. In Railway, create a new project from that GitHub repo.
3. Add environment variables:
   - `OPENAI_API_KEY`
   - `MODEL` = `gpt-5.4`
4. Railway should detect Node automatically.
5. Deploy.

## Notes

- The OpenAI API key is kept on the server side.
- The study perspective is defined in `server.js` and can be refined later.
- This first version is intentionally simple so it is easy to run, edit, and extend.

## Next likely improvements

- add a saved history of previous references
- add a preferred commentary list per book
- add export to markdown or docx
- add a larger “expanded notes” mode
- allow a custom personal perspective prompt from settings
