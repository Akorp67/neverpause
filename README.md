# Never Pause — weneverpause.com

The pre-launch landing page for Never Pause.

- `index.html` is the whole site (one page, no build step).
- Netlify publishes this repo automatically: every change pushed to `main` goes live at weneverpause.com in about a minute.
- The two waitlist forms (`waitlist` and `waitlist-bottom`) are Netlify Forms. Keep `data-netlify='true'` on them or signups stop being collected. New signups flow to MailerLite ("Never Pause waitlist" group) via Zapier.
