const mongoose = require("mongoose");

/**
 * Newsletter list.
 *
 * The public site posts to /api/newsletter/subscribe; the admin panel reads the
 * list through the same router. Emails are stored lower-cased and unique so a
 * repeat signup is an idempotent no-op rather than a duplicate row.
 */
const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    name: String,

    // where the signup came from: footer, sidebar, article, newsletter-page…
    source: { type: String, default: "website" },

    status: {
      type: String,
      enum: ["subscribed", "unsubscribed"],
      default: "subscribed",
      index: true,
    },

    // set on unsubscribe so the history stays auditable
    unsubscribedAt: { type: Date, default: null },

    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Subscriber || mongoose.model("Subscriber", subscriberSchema);
