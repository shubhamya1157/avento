import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendOTPEmail(email: string, otp: string) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "AVENTO - Email Verification OTP",
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

    await transporter.sendMail(mailOptions);
    return { success: true, message: "OTP sent successfully" };
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error("Failed to send OTP email");
  }
}
