import React from "react";
import { ArrowLeft } from "lucide-react";

// ── Legal pages: /privacy and /terms ─────────────────────────────────────────
// Served as URL routes (vercel.json rewrites everything to index.html; App.jsx
// reads window.location.pathname on load). Content is grounded in the storage
// audit — do not add claims the code doesn't back.
const T = {
  bg:      "#FBF8F4",
  text:    "#1E1B16",
  textSub: "#6B6560",
  border:  "#EDE8E2",
  accent:  "#E8654E",
};
const OL = { fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" };

function LegalShell({ title, updated = "July 18, 2026", children }) {
  return (
    <div className="sf-screen" style={{ paddingTop: 64, paddingBottom: 24 }}>
      {/* Top nav — plain anchors: these pages are entered by URL */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 44 }}>
        <a href="/" aria-label="Back to home" style={{ color: T.textSub, display: "flex", padding: 4 }}>
          <ArrowLeft size={18} />
        </a>
        <a href="/" style={{ ...OL, color: T.accent, textDecoration: "none" }}>Speak First</a>
      </div>

      <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.022em", lineHeight: 1.1, margin: "0 0 8px", color: T.text }}>
        {title}
      </h1>
      <p style={{ fontSize: 13, color: T.textSub, margin: "0 0 36px" }}>Last updated: {updated}</p>

      <div style={{ maxWidth: "65ch", fontSize: 15, lineHeight: 1.7, color: T.text }}>{children}</div>
    </div>
  );
}

const H2 = ({ children }) => (
  <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em", margin: "34px 0 10px", color: T.text }}>
    {children}
  </h2>
);
const P = ({ children }) => <p style={{ margin: "0 0 14px" }}>{children}</p>;
const UL = ({ children }) => <ul style={{ margin: "0 0 14px", paddingLeft: 22 }}>{children}</ul>;
const LI = ({ children }) => <li style={{ marginBottom: 8 }}>{children}</li>;

// ── Privacy Policy ────────────────────────────────────────────────────────────

export function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <H2>Who we are</H2>
      <P>
        Speak First is operated by Konstantin Lind as an individual, who acts as the data
        controller for the personal data described here. Contact: tinolind066@gmail.com.
      </P>

      <H2>What we store</H2>
      <UL>
        <LI>
          <strong>Account data</strong> — your email address and hashed login credentials,
          managed through Supabase Auth. If you sign in with Google, we store the email
          address of your Google account.
        </LI>
        <LI>
          <strong>Scenario completions</strong> — your user ID and the ID of each practice
          scenario you mark complete. Nothing else: no transcripts, no scores, no content.
        </LI>
        <LI>
          <strong>Waitlist</strong> — if you join the mobile app waitlist: your email
          address, a consent flag, and a timestamp.
        </LI>
        <LI>
          <strong>Rate-limit counters</strong> — short-lived counters keyed to your IP
          address, used to prevent abuse of our API. They expire automatically.
        </LI>
      </UL>
      <P>
        We set no cookies. For what is kept in your browser, see our{" "}
        <a href="/cookies" style={{ color: T.accent }}>Cookie Notice</a>.
      </P>

      <H2>What we never store</H2>
      <P>
        Conversation transcripts, audio, and coaching feedback are <strong>never stored by
        us</strong>. Your practice sessions exist only in your browser while the session is
        running and disappear when you close the tab or start a new session.
      </P>

      <H2>Third-party processing</H2>
      <P>To run the service, some data passes through these providers:</P>
      <UL>
        <LI>
          <strong>Google</strong> — your browser's built-in speech recognition sends your
          audio to Google for transcription.
        </LI>
        <LI>
          <strong>Anthropic</strong> — your typed or recognized text is sent to generate AI
          replies; via the API, Anthropic does not train on this data.
        </LI>
        <LI><strong>Supabase</strong> — hosts our database and authentication.</LI>
        <LI><strong>Vercel</strong> — hosts the website and keeps standard server logs.</LI>
        <LI><strong>Upstash</strong> — runs the rate-limit counters.</LI>
        <LI><strong>Resend</strong> — delivers our emails.</LI>
      </UL>

      <H2>Legal bases</H2>
      <UL>
        <LI><strong>Contract</strong> — storing account and completion data to provide the service you signed up for.</LI>
        <LI><strong>Consent</strong> — the waitlist; you can withdraw at any time by contacting us.</LI>
        <LI><strong>Legitimate interest</strong> — abuse prevention and rate limiting.</LI>
      </UL>

      <H2>Your rights</H2>
      <P>
        You can access, correct, or delete your data. Account deletion is self-serve in your
        account settings and takes effect immediately. For a copy of your data, or any other
        request, email tinolind066@gmail.com. You also have the right to lodge a complaint with a data
        protection supervisory authority.
      </P>

      <H2>Retention</H2>
      <UL>
        <LI>Account and completion data: until you delete your account.</LI>
        <LI>Waitlist emails: until the mobile app launches or you ask to be removed.</LI>
        <LI>Rate-limit counters: expire automatically shortly after activity stops.</LI>
      </UL>

      <H2>Age</H2>
      <P>Speak First is for users aged 18 and over.</P>

      {/* LEGAL REVIEW NEEDED — international transfer mechanism wording below,
          and: confirm whether a DPIA is required given audio processing through
          third-party providers. */}
      <H2>International transfers</H2>
      <P>
        Our providers are based in the United States. Where your data is transferred
        internationally, those transfers rely on each provider's standard contractual
        safeguards.
      </P>

      <H2>Changes</H2>
      <P>
        If this policy changes, we'll update this page and the date above. Questions:
        tinolind066@gmail.com.
      </P>
    </LegalShell>
  );
}

// ── Cookie Notice ─────────────────────────────────────────────────────────────
// Grounded in what the code actually does, verified before writing:
//   • no cookie is set anywhere (our code never touches document.cookie, and
//     Supabase persists sessions in localStorage, not cookies);
//   • no analytics, tag manager, pixel or third-party script exists;
//   • the only browser storage is the Supabase sign-in session, written after
//     login and strictly necessary to keep the user signed in.
// If any of that changes, this page has to change with it.

export function CookiesPage() {
  return (
    <LegalShell title="Cookie Notice" updated="August 16, 2026">
      <H2>The short version</H2>
      <P>
        <strong>Speak First doesn't use cookies.</strong> Not for analytics, not for
        advertising, not for anything. There is no tracking on this site and no
        third-party scripts collecting data about you.
      </P>

      <H2>What we do store in your browser</H2>
      <P>
        One thing, and only after you sign in: your <strong>login session</strong>. It's
        kept in your browser's local storage (not a cookie) by Supabase, the service
        that handles our accounts.
      </P>
      <UL>
        <LI>
          <strong>What it is</strong> — a token proving you're signed in, so you don't
          have to log in again on every visit.
        </LI>
        <LI>
          <strong>Why it's there</strong> — it is strictly necessary. Without it, staying
          signed in is impossible.
        </LI>
        <LI>
          <strong>How long it lasts</strong> — until you sign out or clear your browser
          storage.
        </LI>
      </UL>
      <P>
        If you never create an account, nothing is stored in your browser at all. You can
        browse this site, and try the Sofía demo, without leaving a trace.
      </P>

      <H2>What we don't do</H2>
      <UL>
        <LI>No analytics — no Google Analytics, Plausible, or anything similar.</LI>
        <LI>No advertising or marketing pixels.</LI>
        <LI>No third-party trackers, embeds, or social widgets.</LI>
        <LI>No cross-site or cross-device tracking, and no profiling.</LI>
      </UL>

      <H2>Your practice sessions</H2>
      <P>
        Conversations aren't stored either — in your browser or on our servers. A practice
        session lives in the page while you're doing it and is gone when you close the tab.
        See the <a href="/privacy" style={{ color: T.accent }}>Privacy Policy</a> for the
        full picture of what we keep.
      </P>

      {/* LEGAL REVIEW NEEDED — the "no consent banner required" conclusion below
          rests on the strictly-necessary exemption in the ePrivacy Directive
          (Art. 5(3)). Confirm before relying on it. */}
      <H2>Why there's no cookie banner</H2>
      <P>
        Consent banners exist for storage that isn't essential — analytics and advertising,
        mostly. Since the only thing we store is the sign-in token you need in order to be
        signed in, there's nothing to ask you to consent to. If that ever changes, we'll ask
        first, and update this page.
      </P>

      <H2>Clearing it</H2>
      <P>
        Signing out removes the session. You can also clear site data for speak-first.org in
        your browser settings at any time — it will simply sign you out.
      </P>

      <H2>Questions</H2>
      <P>Email tinolind066@gmail.com.</P>
    </LegalShell>
  );
}

// ── Terms of Service ──────────────────────────────────────────────────────────

export function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <H2>What Speak First is</H2>
      <P>
        Speak First is a practice tool: you have spoken conversations in Spanish with an AI
        partner and get feedback at the end of each session. The AI's replies and feedback
        are generated automatically and <strong>can be wrong</strong> — about grammar, facts,
        or anything else. Speak First is not a substitute for professional language
        instruction.
      </P>

      <H2>Who can use it</H2>
      <P>You must be at least 18 years old to use Speak First.</P>

      <H2>Acceptable use</H2>
      <P>Don't misuse the service. In particular, don't:</P>
      <UL>
        <LI>attempt to disrupt, overload, or probe the service or its APIs;</LI>
        <LI>use the AI to generate abusive, unlawful, or harmful content;</LI>
        <LI>attempt to extract other users' data or our internal prompts and keys;</LI>
        <LI>resell or rebrand the service without our written permission.</LI>
      </UL>
      <P>We may suspend accounts that violate these rules.</P>

      <H2>Beta service</H2>
      <P>
        Speak First is in beta and currently free. Features may change, break, or be removed,
        and the service may be interrupted or discontinued at any time. We make no uptime
        guarantee. There are no payment terms because there is nothing to pay.
      </P>

      {/* LEGAL REVIEW NEEDED — liability limitation wording. */}
      <H2>Liability</H2>
      <P>
        Speak First is provided "as is" and "as available," without warranties of any kind to
        the extent permitted by law. To the maximum extent permitted by law, we are not
        liable for indirect, incidental, or consequential damages arising from your use of
        the service, and our total liability for any claim is limited to the amount you paid
        us in the twelve months before the claim — which, during the free beta, is zero.
        Nothing in these terms excludes liability that cannot be excluded by law.
      </P>

      {/* LEGAL REVIEW NEEDED — governing law and jurisdiction. */}
      <H2>Governing law</H2>
      <P>
        These terms are governed by the laws of Switzerland, and disputes are subject to
        the courts of the Nyon district.
      </P>

      <H2>Contact</H2>
      <P>Questions about these terms: tinolind066@gmail.com.</P>
    </LegalShell>
  );
}
