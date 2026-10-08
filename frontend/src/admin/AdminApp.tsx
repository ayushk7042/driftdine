import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { PageLoader } from "@/components/ui";
import { AdminLayout } from "./AdminLayout";
import { Login } from "./Auth";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Articles = lazy(() => import("./pages/Articles"));
const ArticleEditor = lazy(() => import("./pages/ArticleEditor"));
const Categories = lazy(() => import("./pages/Categories"));
const Tags = lazy(() => import("./pages/Tags"));
const Media = lazy(() => import("./pages/Media"));
const Ads = lazy(() => import("./pages/Ads"));
const HomepageManager = lazy(() => import("./pages/HomepageManager"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Subscribers = lazy(() => import("./pages/Subscribers"));
const ImportExport = lazy(() => import("./pages/ImportExport"));
const Automation = lazy(() => import("./pages/Automation"));

function Protected() {
  const { admin } = useAuth();
  const loc = useLocation();
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <AdminLayout />;
}

export default function AdminApp() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route element={<Protected />}>
          <Route index element={<Dashboard />} />
          <Route path="articles" element={<Articles />} />
          <Route path="articles/new" element={<ArticleEditor />} />
          <Route path="articles/:id/edit" element={<ArticleEditor />} />
          <Route path="categories" element={<Categories />} />
          <Route path="tags" element={<Tags />} />
          <Route path="media" element={<Media />} />
          <Route path="ads" element={<Ads />} />
          <Route path="homepage" element={<HomepageManager />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="subscribers" element={<Subscribers />} />
          <Route path="import" element={<ImportExport />} />
          <Route path="automation" element={<Automation />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
