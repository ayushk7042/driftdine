const Subscriber = require("../models/Subscriber");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/newsletter/subscribe  (public)
 * Idempotent: an existing address is re-activated instead of erroring, so the
 * visitor always sees a success state.
 */
exports.subscribe = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, message: "A valid email is required" });
    }

    const patch = {
      email,
      status: "subscribed",
      unsubscribedAt: null,
      source: String(req.body.source || "website").slice(0, 60),
      ipAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
    };

    if (req.body.name) patch.name = String(req.body.name).trim().slice(0, 120);

    const subscriber = await Subscriber.findOneAndUpdate(
      { email },
      { $set: patch },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      success: true,
      message: "Subscribed successfully",
      data: { email: subscriber.email, status: subscriber.status },
    });
  } catch (err) {
    console.error("subscribe error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/newsletter/unsubscribe  (public) */
exports.unsubscribe = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, message: "A valid email is required" });
    }

    await Subscriber.findOneAndUpdate(
      { email },
      { $set: { status: "unsubscribed", unsubscribedAt: new Date() } }
    );

    // Never reveal whether the address was on the list.
    res.json({ success: true, message: "Unsubscribed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/newsletter  (admin) — paginated list for the dashboard */
exports.listSubscribers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);

    const query = {};
    if (req.query.status && req.query.status !== "all") query.status = req.query.status;
    if (req.query.search) {
      query.email = new RegExp(
        String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
    }

    const [items, total, active] = await Promise.all([
      Subscriber.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Subscriber.countDocuments(query),
      Subscriber.countDocuments({ status: "subscribed" }),
    ]);

    res.json({
      success: true,
      data: items,
      stats: { active },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** DELETE /api/newsletter/:id  (admin) */
exports.deleteSubscriber = async (req, res) => {
  try {
    const removed = await Subscriber.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Subscriber removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
