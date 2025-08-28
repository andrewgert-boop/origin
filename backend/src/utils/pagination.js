// Утилита для пагинации
const getPagination = (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return { limit: parseInt(limit), offset };
};

module.exports = { getPagination };
