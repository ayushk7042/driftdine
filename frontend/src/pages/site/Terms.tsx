import { Link } from "react-router-dom";
import { ScrollText } from "lucide-react";
import { useSeo } from "@/lib/seo";
import { LegalLayout, PageHero, type LegalSection } from "./PageParts";

const sections: LegalSection[] = [
  { id: "acceptance", title: "Acceptance of terms", body: <><p>By using Driftdine you agree to these terms. If you do not agree, please do not use the site.</p></> },
  { id: "content", title: "Information only", body: <><p>Our articles are for general information and are not financial, legal, investment, security or other professional advice. We work hard to be accurate, but we cannot guarantee that every detail is complete or up to date. Please verify important facts before acting on them.</p></> },
  { id: "use", title: "Using the site", body: <><ul><li>Use Driftdine lawfully and respectfully.</li><li>Do not attempt to disrupt the site, scrape it at a harmful rate, or access areas you are not authorised to use.</li><li>Do not submit unlawful, abusive or misleading content through our forms.</li></ul></> },
  { id: "ip", title: "Copyright and reuse", body: <><p>The articles, design and branding of Driftdine belong to us or our licensors. You may share short excerpts with clear attribution and a link back to the original article. Republishing full articles or images requires written permission through the <Link to="/contact">contact form</Link>.</p></> },
  { id: "links", title: "Third-party links and ads", body: <><p>Articles and ads may link to third-party websites and products. We do not control them and are not responsible for their content or practices. Some links are affiliate links and are labelled as such; we may earn a commission from qualifying purchases.</p></> },
  { id: "newsletter", title: "Newsletter", body: <><p>If you subscribe, you agree to receive our newsletter. You can <Link to="/newsletter#unsubscribe">unsubscribe</Link> at any time.</p></> },
  { id: "disclaimer", title: "Disclaimer of warranties", body: <><p>The site and its content are provided “as is” and “as available”, without warranties of any kind, to the fullest extent permitted by law.</p></> },
  { id: "liability", title: "Limitation of liability", body: <><p>To the fullest extent permitted by law, Driftdine and its team are not liable for any indirect, incidental or consequential loss arising from your use of the site or reliance on its content.</p></> },
  { id: "changes", title: "Changes to these terms", body: <><p>We may update these terms from time to time. The date on this page shows the latest version, and continued use of the site means you accept the changes.</p></> },
  { id: "contact", title: "Questions", body: <><p>If you have questions about these terms, please reach out through the <Link to="/contact">contact form</Link>.</p></> },
];

export default function Terms() {
  useSeo({ title: "Terms of use", description: "The terms that apply when you use Driftdine." });
  return (
    <>
      <PageHero crumb="Terms" label="Legal" icon={<ScrollText className="size-3.5" />} title="Terms of" accent="use" intro="The simple rules that apply when you read and use Driftdine." />
      <LegalLayout sections={sections} updated="October 2026" />
    </>
  );
}
