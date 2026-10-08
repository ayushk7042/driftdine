const express = require("express");
const router = express.Router();

const { loginAdmin } = require("../controllers/auth.controller");

/*
 * Public registration is intentionally NOT exposed: an open /register would let
 * anyone mint a superadmin. Create admins from the server with
 *   node create-admin.js <email> <password> [name]
 */
router.post("/login", loginAdmin);

module.exports = router;
