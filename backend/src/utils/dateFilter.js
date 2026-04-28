export const buildDateFilter = (from, to) => {
  const filter = {};
  if (from && to) filter.date = { gte: new Date(from), lte: new Date(to) };
  else if (from) filter.date = { gte: new Date(from) };
  else if (to) filter.date = { lte: new Date(to) };
  return filter;
};
