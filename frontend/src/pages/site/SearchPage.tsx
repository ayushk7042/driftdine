import { useSearchParams } from "react-router-dom";
import { ArticleListPage } from "./ArticleListPage";

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  return (
    <ArticleListPage
      key={q}
      eyebrow="Search"
      title={q ? `Results for “${q}”` : "Search Driftdine"}
      description={q ? undefined : "Use the search box (⌘K) to find articles, tools and topics."}
      seoTitle={q ? `Search: ${q}` : "Search"}
      noindex
      filters={false}
      emptyText={q ? `We couldn’t find anything for “${q}”. Check the spelling or try a broader term.` : "Type something to start searching."}
    />
  );
}
