import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { SiteLayout } from "@/site/SiteLayout";
import { PageLoader } from "@/components/ui";
import Home from "@/pages/site/Home";

/* Everything except the homepage is split out so the first paint stays small. */
const NewsList = lazy(() => import("@/pages/site/NewsList"));
const ArticlePage = lazy(() => import("@/pages/site/Article"));
const CategoryPage = lazy(() => import("@/pages/site/Category"));
const Categories = lazy(() => import("@/pages/site/Categories"));
const TagsIndex = lazy(() => import("@/pages/site/Tags"));
const TagPage = lazy(() => import("@/pages/site/Tags").then((m) => ({ default: m.TagPage })));
const SearchPage = lazy(() => import("@/pages/site/SearchPage"));
const AuthorPage = lazy(() => import("@/pages/site/Author"));
const Explore = lazy(() => import("@/pages/site/Explore"));
const GalleryPage = lazy(() => import("@/pages/site/Gallery"));
const ContactPage = lazy(() => import("@/pages/site/Contact"));
const NewsletterPage = lazy(() => import("@/pages/site/NewsletterPage"));
const About = lazy(() => import("@/pages/site/Static").then((m) => ({ default: m.About })));
const Privacy = lazy(() => import("@/pages/site/Static").then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import("@/pages/site/Static").then((m) => ({ default: m.Terms })));
const NotFound = lazy(() => import("@/pages/site/Static").then((m) => ({ default: m.NotFound })));

const AdminApp = lazy(() => import("@/admin/AdminApp"));

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<Suspense fallback={<PageLoader />}><AdminApp /></Suspense>} />
      <Route element={<SiteLayout />}>
        <Route index element={<Home />} />
        <Route path="news" element={<NewsList />} />
        <Route path="news/:slug" element={<ArticlePage />} />
        <Route path="category/:slug" element={<CategoryPage />} />
        <Route path="categories" element={<Categories />} />
        <Route path="tags" element={<TagsIndex />} />
        <Route path="tag/:slug" element={<TagPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="author/:name" element={<AuthorPage />} />
        <Route path="explore" element={<Explore />} />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="newsletter" element={<NewsletterPage />} />
        <Route path="about" element={<About />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
