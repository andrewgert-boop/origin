// backend/src/middleware/checkRole.js
// Мидлвар для проверки ролевой модели (RBAC).
// Используется в приватных маршрутах: admin/user/employee.

module.exports = function checkRole(...allowed) {
  return (req, res, next) => {
    try {
      const role = req.user?.role;
      if (!role) return res.status(401).json({ error: 'Unauthorized' });
      if (!allowed.includes(role)) return res.status(403).json({ error: 'Forbidden: insufficient role' });
      next();
    } catch (e) {
      next(e);
    }
  };
};
