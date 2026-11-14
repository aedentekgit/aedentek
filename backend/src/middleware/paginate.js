/**
 * Server-side pagination for every list endpoint.
 *
 * A GET request that carries `?page=` (and optionally `&limit=`, default 10, max 100)
 * gets its `data` array sliced HERE, on the server, and a `pagination` block added:
 *   { page, limit, total, totalPages, hasNext, hasPrev, from, to }
 * Filters (`q`, `status`, `category`, dates …) are applied by the controllers BEFORE the
 * slice, and `kpis` / `summary` blocks are left untouched, so they always describe the
 * whole result set rather than just the visible page. `?sort=field&dir=desc` orders the full
 * result before it is sliced. Requests without `?page=` behave
 * exactly as before. An out-of-range page is clamped to the last page.
 */
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export const paginateArray = (items, query = {}) => {
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(Math.max(parseInt(query.page, 10) || 1, 1), totalPages);
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    pagination: {
      page, limit, total, totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      from: total ? start + 1 : 0,
      to: Math.min(start + limit, total)
    }
  };
};

/** Optional server-side ordering: `?sort=field&dir=asc|desc` on a top-level field of each row. */
const sortRows = (rows, query) => {
  const field = String(query.sort || '').replace(/[^\w.]/g, '');
  if (!field) return rows;
  const dir = String(query.dir || 'asc').toLowerCase() === 'desc' ? -1 : 1;
  const val = (r) => (field.split('.').reduce((o, k) => (o == null ? o : o[k]), r));
  return [...rows].sort((a, b) => {
    const x = val(a);
    const y = val(b);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
    return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' }) * dir;
  });
};

export const paginateResponses = (req, res, next) => {
  if (req.method !== 'GET' || req.query.page === undefined) return next();
  const original = res.json.bind(res);
  res.json = (body) => {
    if (body && body.success !== false && Array.isArray(body.data)) {
      const { items, pagination } = paginateArray(sortRows(body.data, req.query), req.query);
      return original({ ...body, data: items, pagination });
    }
    return original(body);
  };
  return next();
};
