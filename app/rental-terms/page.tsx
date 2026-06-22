// ===========================================================================
// rental-terms/page.tsx — The "/rental-terms" page (Rental Terms)
// ===========================================================================
//
// The "rental-terms" folder makes this page live at "/rental-terms". It feeds
// its wording into the shared <LegalPage> layout (see LegalPage.tsx), which
// renders the premium header, the sections, and the Nav/Footer.
//
// Edit the `SECTIONS` data below to change the rental rules.
// ===========================================================================

import LegalPage, { type LegalSection } from "@/app/component/LegalPage";

const SECTIONS: LegalSection[] = [
  {
    heading: "Eligibility",
    body: [
      "To rent a vehicle through Avento you must be at least 18 years old, hold a valid driving licence for the vehicle category, and present a government-issued photo ID at handover.",
      "The driver named on the booking must be the person who collects and operates the vehicle.",
    ],
  },
  {
    heading: "Booking and Payment",
    body: [
      "Rental charges are calculated per day based on the dates you select. The full amount shown at checkout covers the base rental for that period; any additional charges (such as late returns) are described below.",
      "Your booking is confirmed once payment is authorised. You can view and manage your reservations from your bookings page.",
    ],
  },
  {
    heading: "Security Deposit",
    body: [
      "A refundable security deposit may be required at the start of the rental, depending on the vehicle. The deposit is returned after the vehicle is inspected and confirmed to be in its original condition.",
    ],
  },
  {
    heading: "Fuel and Mileage",
    body: [
      "Vehicles are provided with a set fuel level and should be returned at the same level. Where a mileage limit applies, it will be shown on the listing; usage beyond the limit may incur an extra charge.",
    ],
  },
  {
    heading: "Insurance and Coverage",
    body: [
      "Each rental includes the coverage described on the vehicle listing. You are responsible for any excess, fines, tolls, or damage not covered by the policy that occurs during your rental period.",
    ],
  },
  {
    heading: "Vehicle Care and Prohibited Use",
    body: [
      "You agree to operate the vehicle safely and lawfully. The vehicle must not be used for racing, towing, off-road driving (unless permitted), subletting, transporting illegal goods, or while under the influence of alcohol or drugs.",
      "Smoking and transporting pets are not permitted unless the listing states otherwise.",
    ],
  },
  {
    heading: "Returns and Late Fees",
    body: [
      "Please return the vehicle at the agreed time and location. Late returns may be charged at the daily rate or a pro-rated amount. If you need to extend your rental, request it before the return time so we can confirm availability.",
    ],
  },
  {
    heading: "Cancellations",
    body: [
      "You can cancel a booking from your bookings page. Refund eligibility depends on how far in advance you cancel; cancellations close to the start time may be non-refundable.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "For questions about a rental, contact us at support@avento.com.",
    ],
  },
];

export default function RentalTermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Rental Terms"
      intro="The conditions that apply when you book and drive a vehicle from Avento."
      updated="June 22, 2026"
      sections={SECTIONS}
    />
  );
}
