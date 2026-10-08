import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useSeo } from "@/lib/seo";
import { LegalLayout, PageHero, type LegalSection } from "./PageParts";

const sections: LegalSection[] = [
  { id: "overview", title: "Overview", body: <><p>This policy explains what information Driftdine collects when you read our articles, join our newsletter or contact us, and how we use it. We collect only what we need to run the site and we never sell personal data.</p></> },
  { id: "collect", title: "What we collect", body: <><ul><li><strong>Newsletter:</strong> your email address (and name, if you give it) when you subscribe.</li><li><strong>Contact form:</strong> the name, email, subject and message you send us.</li><li><strong>Usage data:</strong> anonymous page views and basic device and browser information, used to understand what readers find useful.</li><li><strong>Engagement:</strong> counts of likes and shares on an article. Your “saved” and “liked” choices are kept in your own browser.</li></ul></> },
  { id: "use", title: "How we use it", body: <><ul><li>To send the newsletter you asked for and to reply to your messages.</li><li>To measure and improve the site, its speed and its content.</li><li>To keep the site secure and prevent abuse.</li></ul></> },
  { id: "cookies", title: "Cookies and analytics", body: <><p>We use Google Analytics to understand traffic in aggregate. It may set cookies and collect an anonymised view of how pages are used. We also store your light/dark theme choice in your browser. You can block or delete cookies in your browser settings at any time.</p></> },
  { id: "ads", title: "Advertising and affiliate links", body: <><p>Some pages show advertisements from third parties, who may set their own cookies. Some links to products are affiliate links, which means we may earn a commission if you buy — at no extra cost to you. Sponsored and affiliate content is always labelled.</p></> },
  { id: "sharing", title: "Sharing your information", body: <><p>We do not sell your data. We share it only with service providers that help us run the site (for example hosting, email delivery and analytics), and only when required by law.</p></> },
  { id: "retention", title: "How long we keep it", body: <><p>Newsletter addresses are kept until you unsubscribe. Messages sent through the contact form are kept for as long as needed to deal with your request. Anonymous analytics data is retained according to our analytics settings.</p></> },
  { id: "rights", title: "Your choices and rights", body: <><ul><li><Link to="/newsletter#unsubscribe">Unsubscribe</Link> from the newsletter at any time.</li><li>Ask us, through the <Link to="/contact">contact form</Link>, to access, correct or delete the personal information we hold about you.</li><li>Opt out of analytics cookies through your browser or a tracking-protection tool.</li></ul></> },
  { id: "children", title: "Children", body: <><p>Driftdine is written for a general adult audience and is not directed at children under 13. We do not knowingly collect their personal information.</p></> },
  { id: "changes", title: "Changes to this policy", body: <><p>If we change this policy, we will update the date on this page. Continuing to use the site after a change means you accept the updated policy.</p></> },
];

export default function Privacy() {
  useSeo({ title: "Privacy policy", description: "How Driftdine collects, uses and protects your information." });
  return (
    <>
      <PageHero crumb="Privacy" label="Legal" icon={<ShieldCheck className="size-3.5" />} title="Privacy" accent="policy" intro="Plain-language details on what we collect, why, and the choices you have." />
      <LegalLayout sections={sections} updated="October 2026" />
    </>
  );
}
