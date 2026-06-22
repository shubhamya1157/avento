// ===========================================================================
// terms/page.tsx — The "/terms" page (Terms of Service)
// ===========================================================================
//
// A file named page.tsx inside the "terms" folder becomes the web address
// "/terms". This page is pure text, so all it does is hand its wording to the
// shared <LegalPage> layout (see LegalPage.tsx), which renders the premium
// header + sections + Nav/Footer for us.
//
// To edit the policy, just change the `SECTIONS` data below — the layout does
// the rest.
// ===========================================================================

import LegalPage, { type LegalSection } from "@/app/component/LegalPage";

// Each entry is one section of the document: a heading plus its paragraphs.
const SECTIONS: LegalSection[] = [
  {
    heading: "Acceptance of Terms",
    body: [
      "By accessing or using Avento, you agree to be bound by these Terms of Service and all policies referenced here, including our Privacy Policy and Rental Terms. If you do not agree, please do not use the platform.",
      "We may update these terms from time to time. Continued use of Avento after changes take effect means you accept the revised terms.",
    ],
  },
  {
    heading: "Your Account",
    body: [
      "You are responsible for keeping your account credentials secure and for all activity that happens under your account. You must provide accurate information and promptly update it if it changes.",
      "You must be at least 18 years old to create an account and book a vehicle through Avento.",
    ],
  },
  {
    heading: "Bookings and Payments",
    body: [
      "All bookings are subject to vehicle availability and confirmation. Prices are shown in Indian Rupees (₹) and include the charges displayed at checkout unless stated otherwise.",
      "Payments are processed securely through our payment partner. By completing a booking you authorise the applicable charges for the rental period you selected.",
    ],
  },
  {
    heading: "Partner Listings",
    body: [
      "Vehicles may be listed by Avento or by approved partners. Partners are responsible for the accuracy of their listings and for keeping their vehicles roadworthy, insured, and compliant with local law.",
      "Avento reviews partner submissions before they become bookable, but listing a vehicle does not constitute an endorsement of its condition.",
    ],
  },
  {
    heading: "Acceptable Use",
    body: [
      "You agree not to misuse the platform, attempt to disrupt the service, access it through unauthorised means, or use it for any unlawful purpose. We may suspend or terminate accounts that violate these terms.",
    ],
  },
  {
    heading: "Disclaimers and Liability",
    body: [
      "Avento is provided on an \"as is\" and \"as available\" basis. To the fullest extent permitted by law, we disclaim warranties of any kind and are not liable for indirect or consequential damages arising from your use of the platform.",
      "Nothing in these terms limits any rights you have that cannot be limited under applicable law.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "For any questions about these Terms of Service, contact us at support@avento.com.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      intro="The ground rules for using Avento — please read them before booking."
      updated="June 22, 2026"
      sections={SECTIONS}
    />
  );
}
