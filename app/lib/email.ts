// ===========================================================================
// email.ts — Sending the verification (OTP) email
// ===========================================================================
//
// This file's one job: take an email address and a 6-digit code, and actually
// send a nice-looking email containing that code. We use a library called
// "nodemailer" which knows how to talk to email servers (here, Gmail).
//
// HOW SENDING EMAIL WORKS, BRIEFLY:
// We don't run our own mail server. Instead we log in to an existing one (Gmail)
// using a username and an "App Password", and ask it to send the message for
// us. Those secret credentials live in environment variables, never in code.
// ===========================================================================

// "import" brings in code from another package so we can use it. "nodemailer"
// is a library (a bundle of shared, ready-made code) that knows how to send
// email for us, so we don't have to write all that low-level machinery.
import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// A "transporter" is nodemailer's object that holds the connection settings to
// the mail service. We create it ONCE here and reuse it for every email.
//   - service: which provider (defaults to "gmail" if the env var is missing)
//   - auth.user / auth.pass: the login for that mailbox, pulled from env vars
// ---------------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ---------------------------------------------------------------------------
// sendOTPEmail: send the verification code to one recipient.
// Returns a small success object, or throws if the email fails to send (the
// caller — the send-otp route — turns that into an error response).
// ---------------------------------------------------------------------------
export async function sendOTPEmail(email: string, otp: string) {
  // INPUTS: `email` (where to send) and `otp` (the 6-digit code to include).
  // Both are typed `string`, meaning they must be text. "async" (explained
  // again here for convenience) means this function does slow network work and
  // can "await" it.
  //
  // A "try / catch" is a safety net: the app TRIES the risky steps inside `try`,
  // and IF any of them fails (throws an error), it jumps straight to the `catch`
  // block instead of crashing the whole program.
  try {
    // mailOptions describes the message: who it's from, who it's to, the
    // subject line, and the body. Here the body is `html`, so it can be styled
    // (colors, layout) the same way a web page is. The styles are written
    // "inline" because many email apps ignore external stylesheets.
    const mailOptions = {
      from: process.env.EMAIL_USER, // the mailbox the email is sent from
      to: email, // the recipient (the new user)
      subject: "AVENTO - Email Verification OTP",
      // The ${otp} below is a "template literal" — JavaScript drops the actual
      // code value into the HTML at that exact spot.
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;"> <!-- Header --> <div style="background: #000000; padding: 48px 24px; text-align: center; border-radius: 16px 16px 0 0;"> <h1 style=" color: #ffffff; margin: 0; font-size: 34px; font-weight: 800; letter-spacing: 4px; "> Avento </h1> <p style=" color: #a3a3a3; margin: 8px 0 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; "> Verify Your Email </p> </div> <!-- Content --> <div style=" background: #ffffff; border: 1px solid #e5e5e5; border-top: none; padding: 40px 30px; border-radius: 0 0 16px 16px; ">
<p style="
  color: #111827;
  font-size: 16px;
  margin: 0 0 20px;
  line-height: 1.6;
">
  Welcome to Avento pvt. ltd 
</p>

<p style="
  color: #6b7280;
  font-size: 14px;
  margin: 0 0 30px;
  line-height: 1.6;
">
  Enter the verification code below to complete your account setup.
</p>

<!-- OTP -->
<div style="
  background: #fafafa;
  border: 2px solid #000000;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  margin: 30px 0;
">
  <span style="
    color: #000000;
    font-size: 38px;
    font-weight: 800;
    letter-spacing: 12px; 
  font-family: monospace;
  ">
    ${otp}
  </span>
</div>

<p style="
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
">
  This code expires in 10 minutes. Never share it with anyone.
</p>

<div style="
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid #e5e5e5;
  text-align: center;
">
  <p style="
    color: #9ca3af;
    font-size: 12px;
    margin: 0;
  ">
    © 2026 Avento pvt. ltd. All rights reserved.
  </p>
</div>
</div> </div>
      `,
    };

    // Actually hand the message to Gmail to deliver. `await` because sending
    // travels over the network and takes a moment.
    await transporter.sendMail(mailOptions);
    return { success: true, message: "OTP sent successfully" };
  } catch (error) {
    // If anything went wrong (wrong password, no internet, Gmail rejected it),
    // log the real reason for us developers, then throw a simple error for the
    // caller to handle. We don't leak the internal details to the user.
    console.error("Email sending error:", error);
    throw new Error("Failed to send OTP email");
  }
}
