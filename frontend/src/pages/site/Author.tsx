import { useParams } from "react-router-dom";
import { ArticleListPage } from "./ArticleListPage";

export default function AuthorPage() {
  const { name = "" } = useParams();
  const display = decodeURIComponent(name).replace(/-/g, " ");
  return <ArticleListPage key={display} eyebrow="Author" title={display} description={`Stories written by ${display}.`} fixed={{ author: display }} filters={false} />;
}
