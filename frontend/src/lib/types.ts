/* Shapes mirror the Mongoose models in the backend. Everything optional that
 * the API may omit (lean projections drop fields freely). */

export interface ImageRef {
  public_id?: string;
  url?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  alt?: string;
  caption?: string;
  title?: string;
  credit?: string;
  redirectUrl?: string;
  openInNewTab?: boolean;
  nofollow?: boolean;
  lazyLoad?: boolean;
  priority?: boolean;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  shortLabel?: string;
  image?: ImageRef;
  banner?: ImageRef;
  iconImage?: ImageRef;
  ogImage?: ImageRef;
  coverImage?: ImageRef | null;
  parent?: string | null;
  order?: number;
  priority?: number;
  status?: "active" | "inactive";
  featured?: boolean;
  hidden?: boolean;
  showOnHome?: boolean;
  showInMenu?: boolean;
  showInFooter?: boolean;
  autoUpdateEnabled?: boolean;
  dailyAutoUpdateLimit?: number;
  maxSubTrending?: number;
  redirectUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  canonicalUrl?: string;
  robots?: string;
  articleCount?: number;
  children?: Category[];
}

export interface Tag {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
  usageCount?: number;
  featured?: boolean;
  status?: "active" | "inactive";
}

export interface Author {
  name?: string;
  slug?: string;
  image?: ImageRef;
  bio?: string;
  designation?: string;
  email?: string;
  redirectUrl?: string;
  social?: { twitter?: string; instagram?: string; linkedin?: string; website?: string };
}

export type ArticleStatus = "draft" | "published" | "archived" | "scheduled" | "trash";

export interface ContentBlock {
  type: "text" | "image" | "link" | "affiliate" | "html" | "video" | "quote" | "embed";
  value?: unknown;
  meta?: Record<string, unknown>;
}

export interface AffiliateLink {
  title?: string;
  link?: string;
  buttonText?: string;
  productImage?: string;
  price?: string;
}

export interface VideoRef {
  url?: string;
  thumbnail?: ImageRef;
  title?: string;
  caption?: string;
  redirectUrl?: string;
  provider?: string;
  duration?: number;
}

export interface Article {
  _id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description?: string;
  shortDescription?: string;
  longDescription?: string;
  excerpt?: string;
  content?: string;
  contentBlocks?: ContentBlock[];
  featuredImage?: ImageRef;
  ogImage?: ImageRef;
  twitterImage?: ImageRef;
  gallery?: ImageRef[];
  videos?: VideoRef[];
  category?: Category | string | null;
  subCategory?: Category | string | null;
  tags?: (Tag | string)[];
  tagNames?: string[];
  author?: Author;
  status?: ArticleStatus;
  featured?: boolean;
  trending?: boolean;
  popular?: boolean;
  breakingNews?: boolean;
  editorsPick?: boolean;
  isMainTrending?: boolean;
  isSubTrending?: boolean;
  isCategoryTrending?: boolean;
  isCategorySubTrending?: boolean;
  priority?: number;
  homeOrder?: number;
  publishedDate?: string;
  scheduledAt?: string | null;
  updatedDate?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  readTime?: number;
  views?: number;
  likes?: number;
  shareCount?: number;
  clicks?: number;
  language?: string;
  country?: string;
  region?: string;
  destination?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceLinks?: string[];
  canonicalUrl?: string;
  externalLink?: string;
  adsLink?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  seoScore?: number;
  robots?: string;
  schemaMarkup?: unknown;
  affiliateLinks?: AffiliateLink[];
  cta?: { label?: string; url?: string; style?: "primary" | "secondary" | "ghost"; openInNewTab?: boolean };
  advertisement?: { code?: string; position?: string; enabled?: boolean };
  relatedNews?: (Article | string)[];
  internalLinks?: { news?: Article | string; anchorText?: string; isAutoLinked?: boolean }[];
  aiGenerated?: boolean;
  autoUpdateEnabled?: boolean;
  createdBy?: "admin" | "ai" | "import";
  warnings?: string[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore?: boolean;
}

export interface Paged<T> {
  data: T[];
  pagination: Pagination;
}

export interface HomeFeed {
  hero: Article | null;
  breaking: Article[];
  featured: Article[];
  editorsPick: Article[];
  trending: Article[];
  popular: Article[];
  latest: Article[];
  dontMiss: Article[];
}

export interface Rail {
  enabled: boolean;
  mode: "auto" | "manual";
  items: (Article | string)[];
  limit?: number;
}

export type RailKey =
  | "hero" | "heroRail" | "editorsPicks" | "editorsGrid" | "featured"
  | "popular" | "latest" | "dontMiss" | "moreStories" | "inFocus";

export interface GalleryRail {
  enabled: boolean;
  width: "narrow" | "medium" | "wide";
  type: "ad" | "banner";
  size: "auto" | "300x250" | "300x600" | "160x600";
  adPosition: string;
  heading: string;
  image: string;
  imageAlt: string;
  link: string;
  openInNewTab: boolean;
  stretch: boolean;
}

export interface GalleryItem {
  article: Article | string | null;
  image: string;
  title: string;
  category: string;
  link: string;
  order: number;
}

export interface Gallery {
  enabled: boolean;
  title: string;
  subtitle: string;
  actionLabel: string;
  actionLink: string;
  source: "auto" | "manual";
  items: GalleryItem[];
  rails: { left: GalleryRail; right: GalleryRail };
}

export interface CategorySection {
  category: Category | string;
  trending?: Article | string | null;
  subTrending?: (Article | string)[];
}

export interface CategoryStrip {
  enabled: boolean;
  mode: "auto" | "manual";
  items: (Category | string)[];
  eyebrow: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  limit?: number;
}

export interface Homepage {
  mainTrending: Article | null;
  subTrending: Article[];
  categorySections: CategorySection[];
  customHomeBlocks: { title?: string; link?: string; image?: string; order?: number }[];
  heroTitles?: string[];
  heroSubtitle?: string;
  categoryStrip?: CategoryStrip;
  editorsText?: { eyebrow: string; title: string; subtitle: string };
  inFocusText?: { eyebrow: string; title: string; subtitle: string };
  gallery: Gallery;
  sections: Record<RailKey, Rail>;
}

export interface Ad {
  _id: string;
  name: string;
  position: string;
  type: "image" | "script";
  display: "banner" | "frame";
  maxHeight?: number | null;
  image?: ImageRef;
  scriptCode?: string;
  targetUrl?: string;
  openInNewTab?: boolean;
  categories?: (Category | string)[];
  devices?: ("desktop" | "tablet" | "mobile")[];
  priority?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  impressions?: number;
  clicks?: number;
  status: "active" | "paused";
}

export interface Contact {
  _id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  status: "new" | "replied" | "closed";
  reply?: { message?: string; repliedAt?: string };
  createdAt: string;
}

export interface Subscriber {
  _id: string;
  email: string;
  name?: string;
  source?: string;
  status: "subscribed" | "unsubscribed";
  createdAt: string;
  unsubscribedAt?: string | null;
}

export interface MediaItem {
  _id: string;
  name: string;
  originalName?: string;
  folder?: string;
  public_id?: string;
  url: string;
  secureUrl?: string;
  thumbnailUrl?: string;
  resourceType?: "image" | "video" | "raw";
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  alt?: string;
  caption?: string;
  title?: string;
  credit?: string;
  redirectUrl?: string;
  tags?: string[];
  createdAt?: string;
}

export interface AdminUser {
  _id: string;
  name?: string;
  email: string;
  role: "superadmin" | "editor";
  permissions?: { canPublish?: boolean; canDelete?: boolean };
}

export interface DashboardStats {
  categories: number;
  totalNews: number;
  publishedNews: number;
  draftNews: number;
  aiNews: number;
  autoUpdateNews: number;
  avgSeoScore: number;
  newContacts: number;
}

export interface ImportIssue { row: number; field: string; message: string; value?: string }

export interface ImportJob {
  batchId?: string;
  fileName?: string;
  status: "validated" | "importing" | "completed" | "failed" | "rolled_back";
  mode?: "create" | "upsert";
  totalRows: number;
  validRows?: number;
  errorRows?: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  willCreate?: number;
  willUpdate?: number;
  issues?: ImportIssue[];
  preview?: {
    row: number; title: string; slug: string; category: string; status: string;
    action: "create" | "update"; hasImage: boolean; galleryCount: number; valid: boolean;
  }[];
  unknownHeaders?: string[];
  pendingSubCategories?: string[];
  processed?: number;
  canRollback?: boolean;
  createdAt?: string;
  finishedAt?: string;
}
