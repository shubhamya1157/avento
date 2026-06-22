// ===========================================================================
// privacy/page.tsx — The "/privacy" page (Privacy Policy)
// ===========================================================================
//
// The "privacy" folder makes this page live at "/privacy". Like the other legal
// pages it just feeds its wording into the shared <LegalPage> layout, which
// handles the premium header, the section styling, and the Nav/Footer.
//
// Edit the `SECTIONS` data below to change the policy text.
// ===========================================================================

import LegalPage, { type LegalSection } from "@/app/component/LegalPage";

const SECTIONS: LegalSection[] = [
  {
    heading: "Information We Collect",
    body: [
      "We collect the details you give us when you create an account or make a booking — such as your name, email address, phone number, and booking history. If you sign in with Google, we receive basic profile information from your Google account.",
      "Partners who list a vehicle also provide vehicle details, photos, and contact information so their listings can be reviewed and shown to customers.",
    ],
  },
  {
    heading: "How We Use Your Information",
    body: [
      "We use your information to operate the platform: to create and secure your account, process bookings and payments, provide live trip tracking and in-app messaging, offer support, and keep the service safe.",
      "We may use your contact details to send you essential service messages about your bookings. We do not sell your personal information.",
    ],
  },
  {
    heading: "Third-Party Services",
    body: [
      "We rely on trusted third parties to run parts of the service: a payment provider to process transactions, an image host to store vehicle photos, and Google for optional sign-in. These providers only receive the information needed to perform their function.",
    ],
  },
  {
    heading: "Cookies and Sessions",
    body: [
      "We use a secure session cookie to keep you logged in. This is essential to how the platform works and is not used for advertising.",
    ],
  },
  {
    heading: "Data Retention",
    body: [
      "We keep your information for as long as your account is active or as needed to provide the service and meet legal obligations. You can ask us to delete your account, after which we remove your personal data except where we must retain it by law.",
    ],
  },
  {
    heading: "Your Rights",
    body: [
      "You may request access to, correction of, or deletion of your personal information at any time. To make a request, email us at support@avento.com and we will respond within a reasonable period.",
    ],
  },
  {
    heading: "Security",
    body: [
      "We protect your account with industry-standard measures, including hashed passwords and signed sessions. No method of transmission over the internet is perfectly secure, but we work to safeguard your data.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "For privacy questions or requests, contact us at support@avento.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="What information Avento collects, how we use it, and the choices you have."
      updated="June 22, 2026"
      sections={SECTIONS}
    />
  );
}
