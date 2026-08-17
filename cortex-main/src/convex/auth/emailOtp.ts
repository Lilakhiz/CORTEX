import { Email } from "@convex-dev/auth/providers/Email";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15,

  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };

    return generateRandomString(random, "0123456789", 6);
  },

  async sendVerificationRequest({ identifier: email, token }) {
    await resend.emails.send({
      from: "onboarding@resend.dev", // Change this later to your own verified domain
      to: email,
      subject: "Your Cortex verification code",
      html: `
        <div style="font-family:Arial,sans-serif;padding:40px">
          <h2>Cortex Login</h2>

          <p>Your verification code is:</p>

          <h1 style="
            letter-spacing:8px;
            font-size:42px;
            margin:20px 0;
          ">
            ${token}
          </h1>

          <p>This code expires in 15 minutes.</p>

          <hr />

          <small>
            If you didn't request this email, you can safely ignore it.
          </small>
        </div>
      `,
    });
  },
});