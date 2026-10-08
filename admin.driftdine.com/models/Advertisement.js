const mongoose = require("mongoose");
const imageSchema = require("./shared/image.schema");

const AD_POSITIONS = [
  "home-hero",
  "home-top",
  "home-infeed",
  "home-mid",
  // Rails beside the homepage Snap Wall. Each side has its own slot so a pair
  // of banners can face each other; width is chosen in Homepage layout, these
  // slots only supply the creatives.
  "home-gallery-left",
  "home-gallery-right",
  "home-gallery", // legacy single-rail slot
  "home-bottom",
  "sidebar",
  "sidebar-sticky",
  // Three places in the article page's right column, so the panel decides
  // where a creative sits rather than the code.
  "article-sidebar-top",
  "article-sidebar-middle",
  "article-sidebar-bottom",
  "article-top",
  "article-inline",
  "article-bottom",
  "category-top",
  "category-infeed",
  "footer",
  "mobile-sticky-bottom",
];

const advertisementSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    position: {
      type: String,
      enum: AD_POSITIONS,
      required: true,
      index: true,
    },

    // "image" = banner managed here, "script" = adsense/GAM/custom HTML
    type: {
      type: String,
      enum: ["image", "script"],
      default: "image",
    },

    image: imageSchema,
    scriptCode: String,

    // How the creative is framed wherever it renders.
    //   "banner" — the image keeps its own proportions and fills the slot's
    //     full width. Nothing is cropped and no empty space is left around it,
    //     because there is no fixed frame for it to be centred inside.
    //   "frame"  — the slot's standard size is held (300x250, 970x140 …) and
    //     the image is contained inside it. Use when several creatives share a
    //     slot and every rotation has to occupy the same height.
    display: {
      type: String,
      enum: ["banner", "frame"],
      default: "banner",
    },

    // Optional ceiling in pixels for this one creative. Empty means the slot's
    // own default applies — a leaderboard stays leaderboard-sized whatever
    // resolution was uploaded into it.
    maxHeight: { type: Number, default: null },

    targetUrl: String,
    openInNewTab: { type: Boolean, default: true },

    // optional targeting
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    devices: {
      type: [String],
      enum: ["desktop", "tablet", "mobile"],
      default: ["desktop", "tablet", "mobile"],
    },

    priority: { type: Number, default: 0 },

    startsAt: Date,
    endsAt: Date,

    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["active", "paused"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

const Advertisement =
  mongoose.models.Advertisement ||
  mongoose.model("Advertisement", advertisementSchema);

Advertisement.AD_POSITIONS = AD_POSITIONS;

module.exports = Advertisement;
module.exports.AD_POSITIONS = AD_POSITIONS;
