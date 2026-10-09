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

## How consumer financial information is protected

Built in:

- **Saved data is minimal, but not zero.** The database stores client name, phone, email, the repairer's comment and the SSN's last 4 (XXX-XX-1234). Treat it as confidential customer information. The database rules (`firestore.rules`) reject any other field, so an SSN, birth date or report can never be saved, even by mistake.
- **Comments are scrubbed.** Before a comment is saved, anything that looks like a Social Security number or a full account or card number is removed (last 4 kept).
- **Credit reports are never stored.** A report is read inside the browser. SSNs, account numbers and birth dates are masked before the text goes to the AI. Nothing is written to the database, browser storage or the Netlify function logs. The AI provider (OpenAI or Anthropic) receives the masked text and may keep API requests for a limited time under its own data policy; OpenAI calls are sent with `store: false`.
- **Client permission first.** The AI review only runs after staff confirm the client gave written permission and knows the masked text goes to an AI provider.
- **AI providers:** OpenAI requests are sent with `store: false`. Neither OpenAI nor Anthropic uses API data to train models by default. Keys live only in Netlify environment variables.
- **Access control.** Only the emails in `ALLOWED_EMAILS` (Netlify) and in `firestore.rules` (Firebase) can sign in, open client files or use the AI. Every saved record notes who created and last changed it.
- **Automatic sign-out** after 15 minutes without activity, and the screen is wiped on sign-out.
- **Encryption.** Everything travels over HTTPS (HSTS on), and Firebase encrypts stored data at rest. Pages are sent with `no-store` so browsers don't cache client details.

What each credit repair company must still do (not legal advice; confirm with their attorney):

- **FTC Safeguards Rule (GLBA):** a written information security program, a named person in charge, a risk assessment, multi-factor authentication for anyone who opens client information (use Google sign-in with 2-Step Verification turned on), staff training, and notifying the FTC within 30 days of a breach affecting 500 or more consumers.
- **Disposal:** delete a client's record when it is no longer needed (generally no later than 2 years after the last service, unless the law requires keeping it).
- **Credit Repair Organizations Act (CROA):** written contract, the required consumer disclosure, a 3-day cancellation right, and no payment before services are fully performed.
- **State law:** for example Florida's Credit Service Organizations Act (Fla. Stat. 817.7001 and following) has its own registration and bond rules.
- **Privacy notice:** give clients a privacy notice explaining what is collected and how it is used and shared.

## License agreement, credit pull and compliance resources

- **License agreement:** the first time a staff email signs in, the purchasing company must read the WebSwan Credit Repair Software License Agreement, check each acknowledgment, and type an electronic signature. The signature is saved permanently in `license_acceptance` and cannot be edited or deleted from the app. To require everyone to re-sign after changing the agreement, raise `LICENSE_VERSION` in `index.html`.
- **Credit pull:** a full SSN and date of birth can only be typed in the Credit Pull card, after choosing the client and confirming the client's written authorization. They are never saved and are erased when the pull ends, at sign-out, or after 10 minutes. Only `XXX-XX-1234` (last 4) can be saved; the database rules reject any other format.
- **Rules & Resources:** an in-app checklist of what a company must do before selling credit repair (state registration and bond, CROA contract, disclosure and 3-day cancellation, no advance fees, TSR, FCRA authorization, Safeguards Rule, privacy notice), with clickable links to the FTC, CFPB, statutes, Florida FDACS, state attorneys general and the credit bureaus.
- **Database rules:** `firestore.rules` is the exact rule set to publish in each company's Firebase project (replace the two staff emails).
