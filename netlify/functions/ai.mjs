// Credit Repair Software — private AI endpoint (Netlify Function).
// The OpenAI and Anthropic keys live ONLY in Netlify environment variables, never in the page.
// Every request must carry a Firebase sign-in token from an allowed staff email.
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
const PROJECT = process.env.FIREBASE_PROJECT_ID || "webswan-gigoia-task";
const ALLOWED = (process.env.ALLOWED_EMAILS || "thewebswann@gmail.com,taniadomingue373@gmail.com")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

const BASE = `You are the AI assistant inside a credit repair company's software, helping the company's staff serve their clients.
You know the Fair Credit Reporting Act (FCRA, including sections 609, 611, 605B and 623), the Fair Debt Collection Practices Act (FDCPA, including section 809 debt validation), the Credit Repair Organizations Act (CROA), and how credit scoring works (payment history, utilization, age, mix, inquiries).
Rules: give clear, practical, plain-English answers. You provide general education, not legal advice; when a question needs a lawyer, say so in one short line. Never promise score increases or the removal of accurate, timely, verifiable information. Never suggest disputing information the client says is accurate as if it were inaccurate, and never suggest creating a new identity or file segregation. Never ask for or repeat full Social Security or account numbers.`;

const MODES = {
  ask: `${BASE}\nAnswer the staff member's credit question. Keep it focused and actionable.`,
  review: `${BASE}\nYou will receive the text of a consumer credit report (numbers are already masked). Find every negative or questionable item: late payments, collections, charge-offs, repossessions, foreclosures, bankruptcies, judgments, hard inquiries, high utilization, and reporting errors (wrong balances, dates, duplicate accounts, accounts the client may not recognize, inconsistent data across bureaus).
Reply in this structure:
1. Summary: 2 to 3 sentences on the overall picture.
2. Derogatory and questionable items: for each one give the creditor or collector, bureau(s), type, key dates and amounts as shown, why it hurts the score, and the possible basis for a dispute or other action (for example inaccurate data, unverifiable, outdated past 7 years, not theirs, paid but still showing a balance, goodwill candidate, debt validation).
3. How to explain it to the client: a short, kind, plain-language paragraph the staff can read to the client.
4. Suggested next steps and letters: which letter type fits each item.
Only use what is in the report; if something is unclear, say what to verify.`,
  letter: `${BASE}\nWrite a ready-to-print letter for the consumer to send, in the consumer's own voice (first person), professional and firm, citing the correct law section for the letter type. Use the details provided. Use placeholders in [brackets] for anything missing, and use only the last 4 digits of any account number. Include a short list of enclosures (copy of ID and proof of address) and a line for the signature. Output only the letter text, no commentary.`
};

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  // 1) Who is asking?
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  let email = "";
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: `https://securetoken.google.com/${PROJECT}`, audience: PROJECT });
    email = String(payload.email || "").toLowerCase();
  } catch (e) { return json(401, { error: "Please sign in again." }); }
  if (!ALLOWED.includes(email)) return json(403, { error: "This account is not allowed to use the AI assistant." });

  // 2) What do they want?
  let body;
  try { body = await req.json(); } catch (e) { return json(400, { error: "Bad request." }); }
  const mode = MODES[body.mode] ? body.mode : "ask";
  const provider = body.provider === "claude" ? "claude" : "openai";
  const input = String(body.input || "").slice(0, 60000);
  if (!input.trim()) return json(400, { error: "Nothing to send." });

  try {
    let text = "";
    if (provider === "openai") {
      if (!process.env.OPENAI_API_KEY) return json(500, { error: "The OpenAI key is not set in Netlify yet." });
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: OPENAI_MODEL, temperature: 0.3, messages: [{ role: "system", content: MODES[mode] }, { role: "user", content: input }] })
      });
      const d = await r.json();
      if (!r.ok) return json(502, { error: "OpenAI: " + (d.error?.message || r.status) });
      text = d.choices?.[0]?.message?.content || "";
    } else {
      if (!process.env.ANTHROPIC_API_KEY) return json(500, { error: "The Claude (Anthropic) key is not set in Netlify yet." });
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 4000, system: MODES[mode], messages: [{ role: "user", content: input }] })
      });
      const d = await r.json();
      if (!r.ok) return json(502, { error: "Claude: " + (d.error?.message || r.status) });
      text = (d.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
    }
    return json(200, { text, provider });
  } catch (e) {
    return json(502, { error: "The AI service did not answer. Try again." });
  }
};
