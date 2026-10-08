const Category = require("../models/Category");
const { COLUMN_BY_KEY, GALLERY_SEPARATOR } = require("./importSchema.service");
const { parseDate, parseList, zipGallery, makeSlug } = require("../utils/newsHelpers");

/**
 * `slug` is unique across every category, so a sub-category whose name is
 * already taken elsewhere gets a numbered suffix rather than failing the whole
 * import on a duplicate-key error.
 */
const uniqueCategorySlug = async (name) => {
  const base = makeSlug(name) || "section";
  let slug = base;
  for (let i = 2; await Category.exists({ slug }); i += 1) slug = `${base}-${i}`;
  return slug;
};

/**
 * Turns one sheet row into the body shape `buildNewsPayload` understands.
 * Blank cells are omitted entirely so an upsert never wipes existing values.
 */
const rowToBody = (row) => {
  const body = {};
  const has = (k) => row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "";

  /* ---------- straight passthrough ---------- */
  const passthrough = [
    "title", "slug", "category", "subCategory",
    "shortDescription", "longDescription", "content", "excerpt",
    "authorName", "authorImage", "authorBio", "authorDesignation", "authorRedirectUrl",
    "tags", "priority", "featured", "trending", "popular", "breakingNews", "editorsPick",
    "status", "publishedDate", "scheduledAt", "readTime",
    "language", "country", "region", "destination",
    "sourceName", "sourceUrl", "canonicalUrl",
    "metaTitle", "metaDescription", "focusKeyword", "robots", "schema",
    "externalLink",
  ];

  passthrough.forEach((k) => {
    if (has(k)) body[k] = row[k];
  });

  // the News schema requires `description`
  if (has("shortDescription")) body.description = row.shortDescription;

  /* ---------- featured image ---------- */
  if (has("featuredImageUrl")) {
    body.featuredImage = {
      url: row.featuredImageUrl,
      redirectUrl: row.featuredImageRedirect || "",
      alt: row.featuredImageAlt || "",
      caption: row.featuredImageCaption || "",
      credit: row.featuredImageCredit || "",
      priority: true, // above the fold on the article page
    };
  }

  if (has("ogImage")) body.ogImage = { url: row.ogImage };
  if (has("twitterImage")) body.twitterImage = { url: row.twitterImage };

  /* ---------- gallery ---------- */
  if (has("galleryImages")) {
    body.gallery = zipGallery(
      {
        urls: row.galleryImages,
        redirects: row.galleryRedirects,
        captions: row.galleryCaptions,
        alts: row.galleryAlts,
        credits: row.galleryCredits,
      },
      GALLERY_SEPARATOR
    );
  }

  /* ---------- video ---------- */
  if (has("videoUrl")) {
    body.videos = [
      {
        url: row.videoUrl,
        thumbnail: has("videoThumbnail") ? { url: row.videoThumbnail } : undefined,
        redirectUrl: row.videoRedirect || "",
      },
    ];
  }

  /* ---------- cta / ads ---------- */
  if (has("ctaLabel") || has("ctaUrl")) {
    body.cta = { label: row.ctaLabel || "", url: row.ctaUrl || "" };
  }

  if (has("adCode") || has("adPosition")) {
    body.advertisement = {
      code: row.adCode || "",
      position: row.adPosition || "",
      enabled: true,
    };
  }

  return body;
};

/* =========================================================
   VALIDATION
========================================================= */

const URL_RE = /^(https?:)?\/\/[^\s]+$/i;
const VALID_STATUS = ["draft", "published", "archived", "scheduled", "trash"];

/**
 * Words editors actually type in a priority column, and what they mean on the
 * 0-and-up scale the field stores. Higher surfaces earlier in curated rails.
 */
const PRIORITY_WORDS = {
  none: 0,
  low: 0,
  normal: 5,
  medium: 5,
  standard: 5,
  high: 10,
  important: 10,
  top: 20,
  urgent: 20,
  featured: 20,
};

/**
 * Reads a number out of what a person wrote.
 *
 * A sheet filled in by hand carries "4 min" in a read-time column and "Normal"
 * in a priority one — both perfectly clear, and both of which used to fail the
 * whole row. Anything with a number in it yields that number; a known priority
 * word yields its rank; everything else returns null and is reported as before.
 */
const coerceNumber = (value, key) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const text = String(value).trim();
  if (text === "") return null;
  if (Number.isFinite(Number(text))) return Number(text);

  if (key === "priority") {
    const word = PRIORITY_WORDS[text.toLowerCase()];
    if (word !== undefined) return word;
  }

  // "4 min", "~6 minutes", "12 min read"
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};

/**
 * Validate a batch of rows.
 * Category lookups are cached so a 5000-row sheet costs one query per distinct
 * category rather than one per row.
 *
 * @returns {Promise<{rows: object[], errors: object[], summary: object}>}
 */
const validateRows = async (rows, { createMissingSubCategories = true } = {}) => {
  const errors = [];
  const categoryCache = new Map();
  const slugsInSheet = new Map();
  /** Sub-categories this run had to create, reported back to the caller. */
  const createdSubCategories = [];
  /** On a preview: the ones a real import would create. */
  const pendingSubCategories = new Set();

  const lookupCategory = async (value) => {
    const key = String(value).trim().toLowerCase();
    if (categoryCache.has(key)) return categoryCache.get(key);

    const found = await Category.findOne({
      $or: [
        { slug: makeSlug(value) },
        { name: new RegExp(`^${String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        ...(/^[0-9a-fA-F]{24}$/.test(value) ? [{ _id: value }] : []),
      ],
    })
      .select("_id name")
      .lean();

    categoryCache.set(key, found);
    return found;
  };

  const addError = (row, field, message, value) =>
    errors.push({ row: row.__row, field, message, value: String(value ?? "").slice(0, 120) });

  for (const row of rows) {
    /* required */
    if (!row.title || !String(row.title).trim()) {
      addError(row, "Title", "Title is required", row.title);
    }

    if (!row.category) {
      addError(row, "Category", "Category is required", "");
    } else {
      const cat = await lookupCategory(row.category);
      if (!cat) {
        addError(
          row,
          "Category",
          "Category does not exist — add it under Categories, then import again",
          row.category
        );
      } else {
        row.__categoryId = cat._id;
      }
    }

    if (row.subCategory) {
      let sub = await lookupCategory(row.subCategory);

      /*
       * A sub-category is a detail of the section it sits under — "Runway"
       * under "Fashion" — not a taxonomy an editor is expected to build by
       * hand before importing. Tags already create themselves, and a sheet
       * that stopped dead on six unknown sub-categories was the only thing
       * standing between a valid file and a published article, so these are
       * created the same way: as a child of the row's own category.
       */
      if (!sub && createMissingSubCategories && row.__categoryId) {
        const name = String(row.subCategory).trim();
        const created = await Category.create({
          name,
          slug: await uniqueCategorySlug(name),
          parent: row.__categoryId,
          status: "active",
          showOnHome: false,
          description: `${name} stories.`,
        });

        sub = { _id: created._id, name: created.name };
        categoryCache.set(name.toLowerCase(), sub);
        createdSubCategories.push(created.name);
      }

      if (!sub) {
        // On the preview run nothing is written, so this is a note about what
        // the import will add — not a reason to hold the row back.
        if (!createMissingSubCategories) {
          pendingSubCategories.add(String(row.subCategory).trim());
        } else {
          addError(row, "Sub Category", "Sub category does not exist", row.subCategory);
        }
      } else {
        row.__subCategoryId = sub._id;
      }
    }

    if (!row.shortDescription || !String(row.shortDescription).trim()) {
      addError(row, "Short Description", "Short Description is required", "");
    }

    /* slug duplicates inside the sheet */
    const slug = makeSlug(row.slug || row.title || "");
    if (slug) {
      if (slugsInSheet.has(slug)) {
        addError(
          row,
          "Slug",
          `Duplicate slug in the sheet (also on row ${slugsInSheet.get(slug)})`,
          slug
        );
      } else {
        slugsInSheet.set(slug, row.__row);
      }
      row.__slug = slug;
    }

    /* types */
    Object.keys(row).forEach((key) => {
      if (key.startsWith("__")) return;
      const col = COLUMN_BY_KEY.get(key);
      if (!col) return;

      const value = row[key];

      if (col.type === "url" && value && !URL_RE.test(String(value).trim())) {
        addError(row, col.header, "Not a valid URL (must start with http:// or https://)", value);
      }

      if (col.type === "number" && value !== "") {
        const coerced = coerceNumber(value, key);
        if (coerced === null) {
          addError(
            row,
            col.header,
            "Must be a number — or a word this column understands, such as Low / Normal / High",
            value
          );
        } else {
          // Write it back so the import stores the number, not the phrasing.
          row[key] = coerced;
        }
      }

      if (col.type === "date" && value && !parseDate(value)) {
        addError(row, col.header, "Unrecognised date — use YYYY-MM-DD", value);
      }

      if (col.type === "json" && value) {
        try {
          JSON.parse(value);
        } catch {
          addError(row, col.header, "Invalid JSON", value);
        }
      }
    });

    if (row.status && !VALID_STATUS.includes(String(row.status).trim().toLowerCase())) {
      addError(row, "Status", `Must be one of: ${VALID_STATUS.join(", ")}`, row.status);
    }

    /* gallery column length mismatch is a warning-level error */
    if (row.galleryImages) {
      const imgCount = parseList(row.galleryImages, GALLERY_SEPARATOR).length;
      [
        ["galleryRedirects", "Gallery Redirect Links"],
        ["galleryCaptions", "Gallery Captions"],
        ["galleryAlts", "Gallery Alt"],
      ].forEach(([key, header]) => {
        if (!row[key]) return;
        const count = parseList(row[key], GALLERY_SEPARATOR).length;
        if (count > imgCount) {
          addError(
            row,
            header,
            `${count} values for ${imgCount} image(s) — extras are ignored`,
            row[key]
          );
        }
      });
    }
  }

  const rowsWithErrors = new Set(errors.map((e) => e.row));

  return {
    rows,
    errors,
    createdSubCategories: [...new Set(createdSubCategories)],
    pendingSubCategories: [...pendingSubCategories],
    summary: {
      totalRows: rows.length,
      validRows: rows.length - rowsWithErrors.size,
      errorRows: rowsWithErrors.size,
      errorCount: errors.length,
      createdSubCategories: [...new Set(createdSubCategories)].length,
      pendingSubCategories: pendingSubCategories.size,
    },
  };
};

module.exports = { rowToBody, validateRows, VALID_STATUS };
