#!/usr/bin/env node
/**
 * Pull Cloudflare Web Analytics (RUM) via GraphQL and write a public JSON
 * the static site can read. Requires env:
 *   CF_ACCOUNT_ID, CF_API_TOKEN, CF_SITE_TAG
 * Optional:
 *   CF_LOOKBACK_DAYS (default 7 — CF RUM adaptive often returns empty for long windows like 90d)
 *
 * Metrics (honest labels for UI):
 *   count / pageviews  = every pageload (refresh counts)
 *   sum.visits / visits = Cloudflare "visits" (session-style; refresh usually does not inflate)
 *
 * If secrets are missing, writes { ok: false } and exits 0 so builds still pass.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../public/analytics/cloudflare.json');

const accountTag = process.env.CF_ACCOUNT_ID?.trim();
const apiToken = process.env.CF_API_TOKEN?.trim();
const siteTag = process.env.CF_SITE_TAG?.trim();
const lookbackDays = Math.max(1, Number(process.env.CF_LOOKBACK_DAYS || 7) || 7);

async function writeJson(obj) {
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
}

function normPath(p) {
  if (!p || typeof p !== 'string') return '/';
  let s = p.split('?')[0].split('#')[0] || '/';
  if (!s.startsWith('/')) s = `/${s}`;
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s || '/';
}

function addPath(map, raw, pageviews, visits) {
  const key = normPath(raw);
  const cur = map[key] || { pageviews: 0, visits: 0 };
  cur.pageviews += pageviews;
  cur.visits += visits;
  map[key] = cur;
  // Also keep trailing-slash alias for lookup convenience on the client.
  if (key !== '/') {
    const withSlash = `${key}/`;
    const alt = map[withSlash] || { pageviews: 0, visits: 0 };
    alt.pageviews = cur.pageviews;
    alt.visits = cur.visits;
    map[withSlash] = alt;
  }
}

if (!accountTag || !apiToken || !siteTag) {
  console.warn(
    '[cf-analytics] CF_ACCOUNT_ID / CF_API_TOKEN / CF_SITE_TAG not set — writing stub JSON (GoatCounter still works).',
  );
  await writeJson({
    ok: false,
    reason: 'not-configured',
    fetchedAt: new Date().toISOString(),
  });
  process.exit(0);
}

const until = new Date();
const since = new Date(until.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
const sinceIso = since.toISOString().replace(/\.\d{3}Z$/, 'Z');
const untilIso = until.toISOString().replace(/\.\d{3}Z$/, 'Z');

// Flat filter (no AND): long lookbacks (e.g. 90d) often return empty on RUM adaptive.
const query = `
query RumStats($accountTag: String!, $since: Time!, $until: Time!, $siteTag: String!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      totals: rumPageloadEventsAdaptiveGroups(
        filter: { datetime_geq: $since, datetime_lt: $until, siteTag: $siteTag }
        limit: 1
      ) {
        count
        sum { visits }
      }
      byPath: rumPageloadEventsAdaptiveGroups(
        filter: { datetime_geq: $since, datetime_lt: $until, siteTag: $siteTag }
        limit: 5000
        orderBy: [count_DESC]
      ) {
        count
        sum { visits }
        dimensions { requestPath }
      }
    }
  }
}
`;

const variables = {
  accountTag,
  since: sinceIso,
  until: untilIso,
  siteTag,
};

const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query, variables }),
});

const body = await res.json().catch(() => null);
if (!res.ok || !body || body.errors?.length) {
  console.error('[cf-analytics] GraphQL failed:', res.status, JSON.stringify(body?.errors || body, null, 2));
  await writeJson({
    ok: false,
    reason: 'graphql-error',
    status: res.status,
    errors: body?.errors || null,
    fetchedAt: new Date().toISOString(),
  });
  // Do not fail the whole site build; UI falls back to GoatCounter.
  process.exit(0);
}

const account = body.data?.viewer?.accounts?.[0];
const totalsRow = account?.totals?.[0];
const byPathRows = account?.byPath || [];

const paths = {};
for (const row of byPathRows) {
  addPath(paths, row.dimensions?.requestPath, Number(row.count) || 0, Number(row.sum?.visits) || 0);
}

const sitePageviews = Number(totalsRow?.count) || 0;
const siteVisits = Number(totalsRow?.sum?.visits) || 0;

const payload = {
  ok: true,
  source: 'cloudflare-web-analytics',
  fetchedAt: new Date().toISOString(),
  since: sinceIso,
  until: untilIso,
  lookbackDays,
  // Honest metric names for UI copy:
  site: {
    pageviews: sitePageviews, // 访问：每次打开/刷新
    visits: siteVisits, // 访客/访问会话：Cloudflare visits
  },
  paths,
};

await writeJson(payload);
console.log(
  `[cf-analytics] wrote ${outPath} — site pageviews=${sitePageviews} visits=${siteVisits} paths=${Object.keys(paths).length}`,
);
