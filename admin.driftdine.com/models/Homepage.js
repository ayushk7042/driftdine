const mongoose = require("mongoose");

/* ------------------------------------------------------------------ */
/* Gallery block (rendered on the homepage under "Browse Sections")     */
/*                                                                     */
/* Four square tiles in a 2x2 grid, optionally sharing the row with a   */
/* banner/ad rail on the left or the right. The rail's presence and     */
/* width are stored here so the frontend can size the grid instead of   */
/* guessing — that is what keeps the layout from breaking when an       */
/* editor turns the rail on.                                            */
/* ------------------------------------------------------------------ */

const galleryItemSchema = new mongoose.Schema(
  {
    // A tile normally points at an article; the overrides below win when set,
    // so a purely custom tile (image + title + link) is also valid.
    article: { type: mongoose.Schema.Types.ObjectId, ref: "News", default: null },
    image: { type: String, default: "" },
    title: { type: String, default: "" },
    category: { type: String, default: "" },
    link: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const galleryRailSchema = new mongoose.Schema(
  {
    // On by default: the rail only takes a column once a creative is
    // actually booked at `adPosition`, so leaving it on is safe and an ad
    // posted in the panel appears without a second setup step.
    enabled: { type: Boolean, default: true },
    // How much of the twelve-column row this rail takes. A rail on each side
    // gets a narrower share so the tiles keep room for a 2x2 block.
    width: { type: String, enum: ["narrow", "medium", "wide"], default: "narrow" },
    // "ad" renders whatever is booked on `adPosition`; "banner" renders the
    // image/link stored on this document.
    type: { type: String, enum: ["ad", "banner"], default: "ad" },
    // How the rail frames its creative. "auto" holds no frame at all: the
    // artwork keeps its own proportions and fills the rail's width, which is
    // the only setting that can leave no empty space around it. The fixed
    // sizes are for slots that must keep one height across rotations.
    size: {
      type: String,
      enum: ["auto", "300x250", "300x600", "160x600"],
      default: "auto",
    },
    adPosition: { type: String, default: "" },
    heading: { type: String, default: "" },
    image: { type: String, default: "" },
    imageAlt: { type: String, default: "" },
    link: { type: String, default: "" },
    openInNewTab: { type: Boolean, default: true },
    // Stretch the rail card to the tile grid's height. Off by default: a card
    // taller than its creative is exactly what puts empty space above and
    // below the banner.
    stretch: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * Deprecated single-rail shape, kept only so a document saved before the
 * left/right split is migrated on read instead of silently losing its setup.
 */
const legacySidebarSchema = new mongoose.Schema(
  {
    enabled: Boolean,
    side: String,
    width: String,
    type: String,
    adPosition: String,
    heading: String,
    image: String,
    imageAlt: String,
    link: String,
    openInNewTab: Boolean,
    stretch: Boolean,
    sticky: Boolean,
  },
  { _id: false, strict: false }
);

const gallerySchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    title: { type: String, default: "Snap Wall" },
    subtitle: {
      type: String,
      default: "Four frames from the stories everyone is watching right now.",
    },
    actionLabel: { type: String, default: "Open the wall" },
    actionLink: { type: String, default: "/gallery" },
    // "auto" lets the frontend fill the four tiles from the live feed;
    // "manual" uses `items` exactly as curated below.
    source: { type: String, enum: ["auto", "manual"], default: "auto" },
    items: { type: [galleryItemSchema], default: [] }, // max 4 (enforced in controller)

    // One rail per side. Both can run at once, which is when the tiles lock to
    // two-by-two so a pair of banners faces each other across the block.
    rails: {
      left: {
        type: galleryRailSchema,
        default: () => ({ adPosition: "home-gallery-left" }),
      },
      right: {
        type: galleryRailSchema,
        default: () => ({ adPosition: "home-gallery-right" }),
      },
    },

    sidebar: { type: legacySidebarSchema, default: undefined },
  },
  { _id: false }
);

/* ------------------------------------------------------------------ */
/* Curated rails                                                       */
/*                                                                     */
/* One shape for every rail on the homepage. `auto` leaves the section  */
/* to the live feed exactly as it behaves today; `manual` pins the      */
/* stories an editor chose, in their order. `items` is kept even while  */
/* a rail is on auto, so switching back and forth never loses a         */
/* selection.                                                          */
/* ------------------------------------------------------------------ */

const railSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    mode: { type: String, enum: ["auto", "manual"], default: "auto" },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: "News" }],
  },
  { _id: false }
);

/** How many stories each rail renders — the panel caps its picker to this. */
const RAIL_LIMITS = {
  hero: 1,
  heroRail: 4,
  editorsPicks: 5, // slider
  editorsGrid: 4, // the four cards beside the slider
  featured: 4,
  popular: 6,
  latest: 2,
  dontMiss: 2,
  moreStories: 10,
  inFocus: 10,
};

const rail = () => ({ type: railSchema, default: () => ({}) });

const homepageSchema = new mongoose.Schema({

  mainTrending: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "News"
  },

  subTrending: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "News"
    }
  ], // max 5 (controller me enforce hoga)

  categorySections: [
    {
      category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
      },

      trending: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "News"
      },

      subTrending: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "News"
        }
      ] // max 5
    }
  ],

  customHomeBlocks: [
    {
      title: String,
      link: String,
      image: String,
      order: Number
    }
  ],

  gallery: { type: gallerySchema, default: () => ({}) },

  // Headlines that rotate above the hero stories (one every few seconds).
  heroTitles: { type: [String], default: [] },
  // "Browse by Category" strip under the editor's picks. `auto` lists every
  // category flagged showOnHome (with live article counts); `manual` pins the
  // categories chosen here, in this order.
  categoryStrip: {
    type: new mongoose.Schema(
      {
        enabled: { type: Boolean, default: true },
        mode: { type: String, enum: ["auto", "manual"], default: "auto" },
        items: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
        eyebrow: { type: String, default: "" },
        title: { type: String, default: "" },
        subtitle: { type: String, default: "" },
        buttonLabel: { type: String, default: "" },
      },
      { _id: false }
    ),
    default: () => ({}),
  },

  // Heading above the editor's picks block.
  editorsText: {
    type: new mongoose.Schema(
      { eyebrow: { type: String, default: "" }, title: { type: String, default: "" }, subtitle: { type: String, default: "" } },
      { _id: false }
    ),
    default: () => ({}),
  },

  // Copy for the "In Focus" carousel (its stories are the `inFocus` rail).
  inFocusText: {
    type: new mongoose.Schema(
      { eyebrow: { type: String, default: "" }, title: { type: String, default: "" }, subtitle: { type: String, default: "" } },
      { _id: false }
    ),
    default: () => ({}),
  },

  // One-line description shown under the rotating headline.
  heroSubtitle: { type: String, default: "" },

  /**
   * Every rail on the homepage, curated or not. Older documents have no
   * `sections` key at all and simply read as "everything on auto", which is
   * how the page behaved before this existed.
   */
  sections: {
    type: new mongoose.Schema(
      {
        hero: rail(),
        heroRail: rail(),
        editorsPicks: rail(),
        featured: rail(),
        popular: rail(),
        latest: rail(),
        dontMiss: rail(),
        moreStories: rail(),
        editorsGrid: rail(),
        inFocus: rail(),
      },
      { _id: false }
    ),
    default: () => ({}),
  },

}, { timestamps: true });

/** Tiles the grid renders. Four keeps the 2x2 block whole. */
homepageSchema.statics.GALLERY_TILE_COUNT = 4;

homepageSchema.statics.RAIL_LIMITS = RAIL_LIMITS;

module.exports = mongoose.model("Homepage", homepageSchema);
module.exports.RAIL_LIMITS = RAIL_LIMITS;
