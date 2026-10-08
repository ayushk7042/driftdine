const ExcelJS = require("exceljs");
const { Readable } = require("stream");

const {
  COLUMNS,
  COLUMN_BY_KEY,
  matchHeader,
  GALLERY_SEPARATOR,
} = require("./importSchema.service");

/* =========================================================
   SAMPLE WORKBOOK
========================================================= */

const BRAND = {
  header: "FF0B3B36", // deep teal
  headerText: "FFFFFFFF",
  requiredHeader: "FF1F6F5C",
  help: "FFF1F5F4",
  example: "FFFAFAF8",
};

/**
 * Build the downloadable sample workbook.
 * Sheet 1 "Articles"  — headers + a guidance row + a filled example row
 * Sheet 2 "Instructions" — every column explained
 * @returns {Promise<Buffer>}
 */
const buildSampleWorkbook = async () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Driftdine CMS";
  wb.created = new Date();

  /* ---------------- Articles ---------------- */

  const ws = wb.addWorksheet("Articles", {
    views: [{ state: "frozen", ySplit: 2 }],
  });

  ws.columns = COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: Math.min(48, Math.max(18, col.header.length + 8)),
  }));

  // header styling
  const headerRow = ws.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell, colNumber) => {
    const col = COLUMNS[colNumber - 1];
    cell.font = { bold: true, color: { argb: BRAND.headerText }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: col?.required ? BRAND.requiredHeader : BRAND.header },
    };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  });

  // guidance row
  const helpRow = ws.addRow(
    COLUMNS.reduce((acc, col) => {
      acc[col.key] = `${col.required ? "REQUIRED — " : ""}${col.help}`;
      return acc;
    }, {})
  );
  helpRow.height = 44;
  helpRow.eachCell((cell) => {
    cell.font = { italic: true, size: 9, color: { argb: "FF5A6B68" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.help } };
    cell.alignment = { vertical: "top", wrapText: true };
  });

  // example row
  const exampleRow = ws.addRow(
    COLUMNS.reduce((acc, col) => {
      acc[col.key] = col.example ?? "";
      return acc;
    }, {})
  );
  exampleRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.example } };
    cell.alignment = { vertical: "top", wrapText: true };
  });

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS.length },
  };

  /* ---------------- Instructions ---------------- */

  const info = wb.addWorksheet("Instructions");
  info.columns = [
    { header: "Column", key: "header", width: 32 },
    { header: "Required", key: "required", width: 12 },
    { header: "Type", key: "type", width: 12 },
    { header: "What to put in it", key: "help", width: 90 },
  ];

  info.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: BRAND.headerText } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.header } };
  });

  COLUMNS.forEach((col) => {
    const row = info.addRow({
      header: col.header,
      required: col.required ? "Yes" : "",
      type: col.type,
      help: col.help,
    });
    row.alignment = { wrapText: true, vertical: "top" };
  });

  info.addRow({});
  info.addRow({
    header: "Notes",
    help:
      `Delete rows 2 and 3 (guidance + example) before importing. ` +
      `Gallery columns accept multiple values separated by "${GALLERY_SEPARATOR}" and are matched by position. ` +
      `Boolean columns accept TRUE/FALSE, YES/NO or 1/0. ` +
      `Rows whose Slug matches an existing article update that article in upsert mode; ` +
      `blank cells never overwrite existing values.`,
  }).alignment = { wrapText: true, vertical: "top" };

  return wb.xlsx.writeBuffer();
};

/* =========================================================
   READ AN UPLOADED SHEET
========================================================= */

const cellToString = (value) => {
  if (value === null || value === undefined) return "";

  // exceljs rich text
  if (typeof value === "object") {
    if (value.richText) return value.richText.map((t) => t.text).join("");
    if (value.text !== undefined) return String(value.text);
    if (value.hyperlink) return String(value.hyperlink);
    if (value.result !== undefined) return String(value.result); // formula
    if (value instanceof Date) return value.toISOString();
    if (value.error) return "";
  }

  return String(value);
};

/**
 * Parse an uploaded xlsx/csv buffer into normalised rows.
 * @returns {Promise<{rows: object[], headers: string[], unknownHeaders: string[]}>}
 */
class SheetError extends Error {
  constructor(message) {
    super(message);
    this.name = "SheetError";
    this.userFacing = true;   // safe to show an editor verbatim
  }
}

/**
 * Explains, in the editor's terms, why a file could not be opened.
 *
 * The three cases that actually happen: Excel's lock file was picked instead
 * of the workbook (it carries the same name prefixed with `~$` and appears in
 * the file picker while the workbook is open), a legacy `.xls` was uploaded,
 * or the file is not a spreadsheet at all. Each used to surface as a 500 and
 * a jszip stack trace.
 */
const describeUnreadable = (buffer, fileName) => {
  if (/^~\$/.test(fileName.replace(/^.*[\\/]/, ""))) {
    return `"${fileName}" is Excel's temporary lock file, not the spreadsheet. Close the workbook in Excel and upload the file without the "~$" in front of its name.`;
  }

  if (/\.xls$/i.test(fileName)) {
    return `"${fileName}" is in the old .xls format. Open it in Excel and use File → Save As → Excel Workbook (.xlsx), then upload that.`;
  }

  // A real xlsx is a zip; every one starts with "PK".
  const signature = buffer.subarray(0, 2).toString("latin1");
  if (signature !== "PK") {
    return `"${fileName}" is not a readable .xlsx file. If Excel currently has it open, close it and try again — or re-save it as Excel Workbook (.xlsx).`;
  }

  return `"${fileName}" could not be opened. It may be damaged or partly downloaded — re-save it from Excel and upload it again.`;
};

const parseSheet = async (buffer, fileName = "") => {
  const wb = new ExcelJS.Workbook();
  const isCsv = /\.csv$/i.test(fileName);

  try {
    if (isCsv) {
      const stream = Readable.from(buffer.toString("utf8"));
      await wb.csv.read(stream);
    } else {
      await wb.xlsx.load(buffer);
    }
  } catch (err) {
    throw new SheetError(describeUnreadable(buffer, fileName));
  }

  const ws = wb.worksheets[0];
  if (!ws) {
    throw new SheetError(
      `"${fileName}" has no sheets in it. The articles must be on the first sheet, with the column names in row 1.`
    );
  }

  const headerRow = ws.getRow(1);
  const headers = [];
  const unknownHeaders = [];
  const columnKeys = [];

  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const text = cellToString(cell.value).trim();
    headers[colNumber] = text;

    const key = text ? matchHeader(text) : null;
    columnKeys[colNumber] = key;

    if (text && !key) unknownHeaders.push(text);
  });

  /**
   * Reads every data row, optionally inserting one gap in the column mapping.
   *
   * A sheet written by a script sometimes omits a cell rather than leaving it
   * blank. Every value after that point slides one column to the left: the
   * author name lands in "Excerpt", the language in "Read Time", a date in
   * "Status" — and the file fails with dozens of unrelated-looking errors.
   *
   * `gapAt` is the column the missing cell belonged to: everything from there
   * on is read one header later, which puts the row back where it was meant
   * to be. `gapAt = 0` reads the sheet exactly as written.
   */
  const readRows = (gapAt = 0) => {
    const out = [];

    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      const record = { __row: rowNumber };
      let hasValue = false;

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const mapped = gapAt && colNumber >= gapAt ? colNumber + 1 : colNumber;
        const key = columnKeys[mapped];
        if (!key) return;

        const raw = cell.value;
        const value = raw instanceof Date ? raw : cellToString(raw).trim();

        if (value !== "" && value !== null) {
          record[key] = value;
          hasValue = true;
        }
      });

      if (hasValue) out.push(record);
    });

    return out;
  };

  /**
   * How well a reading fits the columns it claims to fill: a URL column
   * holding a URL scores, one holding a sentence loses. Only typed columns
   * count — free text fits anything and would drown the signal. A missing
   * title counts heavily against, since every row must have one.
   */
  const scoreRows = (candidate) => {
    let score = 0;

    for (const record of candidate) {
      // A reading that empties a column the import cannot do without is the
      // wrong reading, however well the rest of it lines up.
      for (const required of ["title", "category", "shortDescription"]) {
        if (!String(record[required] || "").trim()) score -= 5;
      }

      // A few columns have an unmistakable shape, and they are the ones that
      // tell a correct alignment from a plausible-looking wrong one — typed
      // columns alone leave too many readings tied.
      const slug = String(record.slug || "").trim();
      if (slug) score += /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(slug) ? 2 : -2;

      const status = String(record.status || "").trim().toLowerCase();
      if (status) {
        score += ["draft", "published", "archived", "scheduled", "trash"].includes(status) ? 2 : -2;
      }

      // A category is a name ("Technology"), never a slug or a URL.
      for (const key of ["category", "subCategory"]) {
        const value = String(record[key] || "").trim();
        if (!value) continue;
        const looksLikeSlugOrUrl =
          /^https?:\/\//i.test(value) || /^[a-z0-9]+(?:-[a-z0-9]+){2,}$/.test(value);
        score += looksLikeSlugOrUrl ? -2 : 1;
      }

      for (const [key, value] of Object.entries(record)) {
        if (key.startsWith("__") || value === "" || value == null) continue;
        const col = COLUMN_BY_KEY.get(key);
        if (!col) continue;

        const text = String(value).trim();

        if (col.type === "url") {
          score += /^(https?:)?\/\//i.test(text) ? 1 : -1;
        } else if (col.type === "number") {
          score += /^\s*\d/.test(text) ? 1 : -1;
        } else if (col.type === "date") {
          score += Number.isFinite(Date.parse(text)) ? 1 : -1;
        } else if (col.type === "json") {
          try {
            JSON.parse(text);
            score += 1;
          } catch {
            score -= 1;
          }
        } else if (col.type === "boolean") {
          score += /^(true|false|yes|no|y|n|1|0)$/i.test(text) ? 1 : -1;
        }
      }
    }

    return score;
  };

  let rows = readRows(0);
  let alignmentShift = 0;

  if (rows.length) {
    let best = scoreRows(rows);

    // Where does the missing cell sit? Try each position and keep the reading
    // that fits the columns best. A correctly aligned sheet always wins here,
    // because inserting a gap into it only makes the fit worse.
    for (let gapAt = 2; gapAt <= headers.length; gapAt += 1) {
      const candidate = readRows(gapAt);
      if (!candidate.length) continue;

      const score = scoreRows(candidate);
      if (score > best + 2) {
        best = score;
        rows = candidate;
        alignmentShift = gapAt;
      }
    }
  }

  // Drop the sample sheet's guidance row if it survived a copy-paste.
  const cleaned = rows.filter((r) => {
    const title = String(r.title || "");
    return !/^REQUIRED —/i.test(title) && !/^Article headline\./i.test(title);
  });

  return {
    rows: cleaned,
    headers: headers.filter(Boolean),
    unknownHeaders,
    alignmentShift,
  };
};

/* =========================================================
   EXPORT ARTICLES -> WORKBOOK
========================================================= */

const flattenArticle = (n) => ({
  title: n.title || "",
  slug: n.slug || "",
  category: n.category?.name || "",
  subCategory: n.subCategory?.name || "",
  shortDescription: n.shortDescription || n.description || "",
  longDescription: n.longDescription || "",
  content: n.content || "",
  excerpt: n.excerpt || "",

  authorName: n.author?.name || "",
  authorImage: n.author?.image?.url || "",
  authorBio: n.author?.bio || "",
  authorDesignation: n.author?.designation || "",
  authorRedirectUrl: n.author?.redirectUrl || "",

  featuredImageUrl: n.featuredImage?.url || "",
  featuredImageRedirect: n.featuredImage?.redirectUrl || "",
  featuredImageAlt: n.featuredImage?.alt || "",
  featuredImageCaption: n.featuredImage?.caption || "",
  featuredImageCredit: n.featuredImage?.credit || "",

  galleryImages: (n.gallery || []).map((g) => g.url).join(GALLERY_SEPARATOR),
  galleryRedirects: (n.gallery || []).map((g) => g.redirectUrl || "").join(GALLERY_SEPARATOR),
  galleryCaptions: (n.gallery || []).map((g) => g.caption || "").join(GALLERY_SEPARATOR),
  galleryAlts: (n.gallery || []).map((g) => g.alt || "").join(GALLERY_SEPARATOR),
  galleryCredits: (n.gallery || []).map((g) => g.credit || "").join(GALLERY_SEPARATOR),

  videoUrl: n.videos?.[0]?.url || "",
  videoThumbnail: n.videos?.[0]?.thumbnail?.url || "",
  videoRedirect: n.videos?.[0]?.redirectUrl || "",

  tags: (n.tagNames || []).join(", "),
  priority: n.priority ?? 0,
  featured: n.featured ? "TRUE" : "FALSE",
  trending: n.trending ? "TRUE" : "FALSE",
  popular: n.popular ? "TRUE" : "FALSE",
  breakingNews: n.breakingNews ? "TRUE" : "FALSE",
  editorsPick: n.editorsPick ? "TRUE" : "FALSE",
  status: n.status || "",
  publishedDate: n.publishedDate ? new Date(n.publishedDate).toISOString().slice(0, 10) : "",
  scheduledAt: n.scheduledAt ? new Date(n.scheduledAt).toISOString() : "",
  readTime: n.readTime || "",

  language: n.language || "",
  country: n.country || "",
  region: n.region || "",
  destination: n.destination || "",

  sourceName: n.sourceName || "",
  sourceUrl: n.sourceUrl || "",
  canonicalUrl: n.canonicalUrl || "",

  metaTitle: n.metaTitle || n.seoTitle || "",
  metaDescription: n.metaDescription || n.seoDescription || "",
  focusKeyword: n.focusKeyword || "",
  robots: n.robots || "",
  ogImage: n.ogImage?.url || "",
  twitterImage: n.twitterImage?.url || "",
  schema: n.schemaMarkup ? JSON.stringify(n.schemaMarkup) : "",

  externalLink: n.externalLink || "",
  ctaLabel: n.cta?.label || "",
  ctaUrl: n.cta?.url || "",
  adCode: n.advertisement?.code || "",
  adPosition: n.advertisement?.position || "",
});

/** @returns {Promise<Buffer>} */
const buildExportWorkbook = async (articles = []) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Driftdine CMS";

  const ws = wb.addWorksheet("Articles", { views: [{ state: "frozen", ySplit: 1 }] });

  ws.columns = COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: Math.min(48, Math.max(16, col.header.length + 6)),
  }));

  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: BRAND.headerText } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.header } };
  });

  articles.forEach((a) => ws.addRow(flattenArticle(a)));

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  return wb.xlsx.writeBuffer();
};

module.exports = {
  buildSampleWorkbook,
  buildExportWorkbook,
  parseSheet,
  flattenArticle,
  SheetError,
};
