/**
 * Shared server-side pagination for every table.
 *
 *   const { rows, kpis, pager, loading, error, reload } = usePaged('/api/accounts/emi', { q, status });
 *   …render the table from `rows`, then place `pager` underneath it.
 *
 * The hook asks the API for ONE page at a time (`?page=N&limit=10`); the backend filters,
 * slices and returns `{ data, pagination, kpis }`. Changing any filter returns to page 1.
 * Theme tokens only — see the `.pager` block in signin-styles.css.
 */
import { Ft as ReactHooks, vt as Icon, yt as jsxRuntime } from './ui-D4_WaMI9.js';

const { useState, useEffect } = ReactHooks();
const runtime = jsxRuntime();
const jsx = runtime.jsx;
const jsxs = runtime.jsxs;

export const PAGE_SIZE = 10;

const pageWindow = (page, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  const lo = Math.max(2, page - 1);
  const hi = Math.min(total - 1, page + 1);
  if (lo > 2) out.push('…l');
  for (let i = lo; i <= hi; i += 1) out.push(i);
  if (hi < total - 1) out.push('…r');
  out.push(total);
  return out;
};

export function Pager({ pagination, onPage, noun = 'records' }) {
  if (!pagination || !pagination.total) return null;
  const { page, totalPages, total, from, to } = pagination;
  const btn = (label, target, opts) =>
    jsx('button', {
      type: 'button',
      className: `pager__btn${opts && opts.current ? ' is-current' : ''}${opts && opts.wide ? ' pager__btn--wide' : ''}`,
      disabled: opts && opts.disabled,
      'aria-label': opts && opts.aria ? opts.aria : `Page ${target}`,
      'aria-current': opts && opts.current ? 'page' : undefined,
      'data-page': target,
      onClick: () => onPage(target),
      children: label
    }, `${label}-${target}-${opts && opts.k ? opts.k : ''}`);
  return jsxs('nav', {
    className: 'pager',
    'aria-label': 'Pagination',
    'data-pager': '',
    children: [
      jsxs('span', { className: 'pager__info', children: ['Showing ', jsx('b', { children: `${from}–${to}` }), ' of ', jsx('b', { children: total }), ` ${noun}`] }),
      totalPages > 1
        ? jsxs('span', {
            className: 'pager__nav',
            children: [
              jsxs('button', { type: 'button', className: 'pager__btn pager__btn--wide pager__prev', disabled: !pagination.hasPrev, onClick: () => onPage(page - 1), 'aria-label': 'Previous page', children: [jsx(Icon, { name: 'chev-l' }), 'Previous'] }, 'prev'),
              ...pageWindow(page, totalPages).map((p) =>
                typeof p === 'number'
                  ? btn(p, p, { current: p === page })
                  : jsx('span', { className: 'pager__gap', children: '…' }, p)
              ),
              jsxs('button', { type: 'button', className: 'pager__btn pager__btn--wide pager__next', disabled: !pagination.hasNext, onClick: () => onPage(page + 1), 'aria-label': 'Next page', children: ['Next', jsx(Icon, { name: 'chev-r' })] }, 'next')
            ]
          })
        : null
    ]
  });
}

const toQuery = (params) =>
  Object.entries(params)
    .filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== false)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

/**
 * @param {string} base   endpoint, may already contain a query string
 * @param {object} params filters sent to the server (empty values are dropped)
 * @param {{limit?:number, enabled?:boolean, noun?:string}} opts
 */
export function usePaged(base, params = {}, opts = {}) {
  const limit = opts.limit || PAGE_SIZE;
  const key = base + '|' + JSON.stringify(params || {});
  const [pg, setPg] = useState({ key, page: 1 });
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ body: null, loading: true, error: '' });
  const page = pg.key === key ? pg.page : 1;
  const enabled = opts.enabled !== false;

  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    const qs = toQuery({ ...params, page, limit });
    const url = `${base}${base.includes('?') ? '&' : '?'}${qs}`;
    fetch(url, { headers: { 'Content-Type': 'application/json' } })
      .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (!alive) return;
        if (ok && body && body.success !== false) {
          setState({ body, loading: false, error: '' });
          if (body.pagination && body.pagination.page !== page) setPg({ key, page: body.pagination.page });
        } else setState({ body: null, loading: false, error: (body && body.message) || 'The service is not reachable right now.' });
      })
      .catch((e) => alive && setState({ body: null, loading: false, error: e.message || 'Network error' }));
    return () => { alive = false; };
  }, [key, page, tick, enabled]);

  const body = state.body || {};
  const setPage = (n) => setPg({ key, page: Math.max(1, n) });
  const pagination = body.pagination || null;
  return {
    rows: Array.isArray(body.data) ? body.data : [],
    data: body.data === undefined ? null : body.data,
    body,
    kpis: body.kpis || null,
    pagination,
    page,
    setPage,
    loading: state.loading,
    error: state.error,
    reload: () => setTick((n) => n + 1),
    pager: pagination ? jsx(Pager, { pagination, onPage: setPage, noun: opts.noun }) : null
  };
}
