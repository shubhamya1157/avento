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
  try {
    // mailOptions describes the message: who it's from, who it's to, the
    // subject line, and the body. Here the body is `html`, so it can be styled
    // (colors, layout) the same way a web page is. The styles are written
    // "inline" because many email apps ignore external stylesheets.
    const mailOptions = {
      from: process.env.EMAIL_USER, // the mailbox the email is sent from
      to: email,                    // the recipient (the new user)
      subject: "AVENTO - Email Verification OTP",
      // The ${otp} below is a "template literal" — JavaScript drops the actual
      // code value into the HTML at that exact spot.
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">AVENTO CLUB</h1>
            <p style="color: rgba(255, 255, 255, 0.8); margin: 5px 0;">Email Verification</p>
          </div>

          <div style="background: #f8f9fa; padding: 40px 20px; border-radius: 0 0 10px 10px;">
            <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
              Thank you for registering with AVENTO Club!
            </p>

            <p style="color: #666; font-size: 14px; margin: 0 0 30px 0;">
              Your One-Time Password (OTP) for email verification is:
            </p>

            <div style="background: white; padding: 20px; text-align: center; border-radius: 8px; border: 2px solid #667eea; margin: 20px 0;">
              <p style="font-size: 32px; font-weight: bold; color: #667eea; margin: 0; letter-spacing: 5px;">
                ${otp}
              </p>
            </div>

            <p style="color: #999; font-size: 12px; margin: 20px 0 0 0;">
              This OTP will expire in 10 minutes. Do not share this code with anyone.
            </p>

            <p style="color: #666; font-size: 14px; margin: 20px 0 0 0;">
              If you didn't register for AVENTO Club, please ignore this email.
            </p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © 2024 AVENTO Club. All rights reserved.
              </p>
            </div>
          </div>
        </div>
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
