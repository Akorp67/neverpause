# Code Nudge

A Chrome extension for people who use AI a lot but aren't sure when a prompt belongs in Claude Code instead of normal chat.

While you type in Claude, ChatGPT, Gemini or Copilot, it reads your prompt (on your machine, nothing is sent anywhere). If it looks like Claude Code work, a small card shows up above the box before you hit enter:

- **This is a job for Claude Code** - with a one-line reason and a "Why?" list.
- **Open in Claude Code** copies your prompt and opens claude.ai/code.
- **Keep it in chat** hides it for that prompt.

The popup counts how often you got nudged, sent it to Code, or kept it in chat, so you can see the habit build.

## What counts as a Claude Code job

- Working on a repo, codebase or project folder
- Anything that needs running, testing, installing or deploying
- Errors and stack traces
- Building an app, site, script, bot or tool
- Doing the same thing to lots of files or data
- Multi-step jobs

Questions, explanations, emails, summaries and brainstorming stay in chat.

The rules are in `classifier.js`. Run `node test/classifier.test.js` to check them.

## Install (for now, unpacked)

1. Open `chrome://extensions`
2. Turn on Developer mode (top right)
3. Click "Load unpacked" and pick this `code-nudge` folder
4. Go to claude.ai and start typing

To try it without installing, open `test/demo.html` in a browser.
