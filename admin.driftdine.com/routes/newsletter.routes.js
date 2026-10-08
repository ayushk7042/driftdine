const express = require("express");
const router = express.Router();

const newsletter = require("../controllers/newsletter.controller");

const { authMiddleware } = require("../middlewares/auth.middleware");
const { adminMiddleware } = require("../middlewares/admin.middleware");

/* ---------- public ---------- */
router.post("/subscribe", newsletter.subscribe);
router.post("/unsubscribe", newsletter.unsubscribe);

/* ---------- admin ---------- */
router.get("/", authMiddleware, adminMiddleware(), newsletter.listSubscribers);
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware("canDelete"),
  newsletter.deleteSubscriber
);

module.exports = router;
