const express = require("express");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

const pagePermissions = {
  mod: ["admin-apuestas", "admin-recargas"],
  admin: [
    "admin-apuestas",
    "admin-recargas",
    "admin-retiros",
    "admin-micuenta",
    "admin-configuracion-mod",
  ],
};

const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Solo admin" });
  }
  return next();
};

router.get("/roles/pages", authMiddleware, (req, res) => {
  const role = req.user?.role || "user";
  res.json({
    success: true,
    role,
    pages: pagePermissions[role] || [],
  });
});

router.get("/admin/mod-pages", authMiddleware, isAdmin, (req, res) => {
  res.json({ success: true, pages: pagePermissions.mod });
});

router.put("/admin/mod-pages", authMiddleware, isAdmin, (req, res) => {
  const { pages } = req.body;

  if (!Array.isArray(pages) || pages.some((page) => typeof page !== "string")) {
    return res
      .status(400)
      .json({ success: false, message: "Formato de páginas inválido" });
  }

  pagePermissions.mod = pages;
  return res.json({ success: true, pages: pagePermissions.mod });
});

module.exports = router;
