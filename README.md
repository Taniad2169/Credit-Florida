# Credit Repair Software

Staff tool for a credit repair company, by WebSwan Digital Solutions.

## What it does
- **Staff sign-in** with a work email link or Google (Firebase Authentication). No passwords in the page.
- **Client database** (Firestore collection `credit_clients`): saves **only** name, phone, email and the staff comment. SSNs, birth dates, employment and credit reports are never saved.
- **AI Credit Assistant** (OpenAI or Claude, switchable): answers credit questions, reviews an uploaded credit report for derogatory items with a plain-language explanation for the client, and writes FCRA 609/611/623/605B, FDCPA 809 and goodwill letters.
- Uploaded reports are read in the browser; SSNs and long account numbers are masked before text is sent to the AI.
- Client application form with disclosures, e-signature, print/PDF.

## Deploy (Netlify, connected to this GitHub repo)
1. Netlify → Add new site → Import from GitHub → pick this repo. Build command: none. Publish directory: `.`
2. Site settings → Environment variables (private, never in the page):
   - `OPENAI_API_KEY` = your OpenAI key
   - `ANTHROPIC_API_KEY` = your Anthropic (Claude) key
   - `ALLOWED_EMAILS` = comma-separated staff emails allowed to use the AI
   - optional: `OPENAI_MODEL`, `ANTHROPIC_MODEL`, `FIREBASE_PROJECT_ID`
3. Firebase console → Authentication → Sign-in method: enable **Email link (passwordless)** and **Google**; Settings → Authorized domains: add the Netlify domain.
4. Firestore rules must allow the staff emails to read/write `credit_clients`.

Credit scores are not pulled from SSN/DOB: that requires a contracted credit-data provider and FCRA permissible purpose. Clients pull their own report and the staff uploads it.
