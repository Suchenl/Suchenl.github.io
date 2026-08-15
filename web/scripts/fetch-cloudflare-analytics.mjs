#!/usr/bin/env node
/**
 * Cloudflare Web Analytics → cumulative site stats + weekly history.
 *
 * Env:
 *   CF_ACCOUNT_ID, CF_API_TOKEN, CF_SITE_TAG  (required to fetch)
 *   CF_WEEKLY_UPDATE=1   fetch the just-completed Beijing week and upsert history
 *   CF_BOOTSTRAP=1      if history empty, seed from accumulateSince → now (partial week OK)
 *
 * Without secrets / without UPDATE: rebuilds display JSON from existing history (if any).
 *
 * Writes:
 *   public/analytics/cloudflare-history.json  — weeks[] for trends + cumulative totals
 *   public/analytics/cloudflare.json          — display mirror for the site footer/posts
 *
 * Week boundary: Monday 00:00 Asia/Shanghai. Cron should run then and pull [Mon, next Mon).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const analyticsDir = join(__dirname, '../public/analytics');
const historyPath = join(analyticsDir, 'cloudflare-history.json');
const displayPath = join(analyticsDir, 'cloudflare.json');

const accountTag = process.env.CF_ACCOUNT_ID?.trim();
const apiToken = process.env.CF_API_TOKEN?.trim();
const siteTag = process.env.CF_SITE_TAG?.trim();
const doWeekly = process.env.CF_WEEKLY_UPDATE === '1';
const doBootstrap = process.env.CF_BOOTSTRAP === '1';

/** Beacon / accumulation start (Beijing calendar day). */
const ACCUMULATE_SINCE_LABEL = '2026-08-13';
const ACCUMULATE_SINCE = '2026-08-13T00:00:00+08:00';

const QUERY = `
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

function toIsoZ(d) {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Format a Date as YYYY-MM-DD in Asia/Shanghai. */
function beijingYmd(d) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Monday 00:00 Asia/Shanghai as a UTC Date, for the Beijing week containing `d`. */
function beijingWeekStart(d = new Date()) {
  const ymd = beijingYmd(d);
  const [y, m, day] = ymd.split('-').map(Number);
  // Noon UTC on that Beijing calendar day → stable weekday in Shanghai
  const probe = new Date(Date.UTC(y, m - 1, day, 4, 0, 0)); // 12:00 CST
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', weekday: 'short' }).format(probe);
  const map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const offset = map[wd] ?? 0;
  const mondayDay = day - offset;
  // Monday 00:00 CST = Sunday 16:00 UTC
  return new Date(Date.UTC(y, m - 1, mondayDay, -8, 0, 0));
}

function addDaysUtc(d, n) {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
}

function normPath(p) {
  if (!p || typeof p !== 'string') return '/';
  let s = p.split('?')[0].split('#')[0] || '/';
  if (!s.startsWith('/')) s = `/${s}`;
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s || '/';
}

function emptyPaths() {
  return {};
}

function addPath(map, raw, pageviews, visits) {
  const key = normPath(raw);
  const cur = map[key] || { pageviews: 0, visits: 0 };
  cur.pageviews += pageviews;
  cur.visits += visits;
  map[key] = cur;
  if (key !== '/') {
    const withSlash = `${key}/`;
    map[withSlash] = { pageviews: cur.pageviews, visits: cur.visits };
  }
}

function mergePaths(into, from) {
  for (const [k, v] of Object.entries(from || {})) {
    if (k.endsWith('/') && k !== '/') continue; // rebuild slash aliases from canonical
    addPath(into, k, Number(v.pageviews) || 0, Number(v.visits) || 0);
  }
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function writeJson(path, obj) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
}

async function fetchWindow(since, until) {
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: QUERY,
      variables: {
        accountTag,
        since: toIsoZ(since),
        until: toIsoZ(until),
        siteTag,
      },
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || body.errors?.length) {
    const err = new Error(`GraphQL failed: ${res.status} ${JSON.stringify(body?.errors || body)}`);
    err.body = body;
    err.status = res.status;
    throw err;
  }
  const account = body.data?.viewer?.accounts?.[0];
  const totalsRow = account?.totals?.[0];
  const paths = emptyPaths();
  for (const row of account?.byPath || []) {
    addPath(paths, row.dimensions?.requestPath, Number(row.count) || 0, Number(row.sum?.visits) || 0);
  }
  return {
    site: {
      pageviews: Number(totalsRow?.count) || 0,
      visits: Number(totalsRow?.sum?.visits) || 0,
    },
    paths,
  };
}

function sumWeeks(weeks) {
  const site = { pageviews: 0, visits: 0 };
  const paths = emptyPaths();
  for (const w of weeks) {
    site.pageviews += Number(w.site?.pageviews) || 0;
    site.visits += Number(w.site?.visits) || 0;
    mergePaths(paths, w.paths);
  }
  return { site, paths };
}

function upsertWeek(weeks, week) {
  const i = weeks.findIndex((w) => w.weekId === week.weekId);
  if (i >= 0) weeks[i] = week;
  else weeks.push(week);
  weeks.sort((a, b) => a.weekId.localeCompare(b.weekId));
  return weeks;
}

function emptyHistory() {
  return {
    ok: true,
    source: 'cloudflare-web-analytics-cumulative',
    timezone: 'Asia/Shanghai',
    accumulateSince: ACCUMULATE_SINCE,
    accumulateSinceLabel: ACCUMULATE_SINCE_LABEL,
    updatedAt: null,
    site: { pageviews: 0, visits: 0 },
    paths: {},
    weeks: [],
  };
}

function toDisplay(history) {
  return {
    ok: Boolean(history?.ok) && Array.isArray(history.weeks),
    source: 'cloudflare-web-analytics-cumulative',
    mode: 'cumulative',
    accumulateSince: history.accumulateSince,
    accumulateSinceLabel: history.accumulateSinceLabel,
    timezone: history.timezone || 'Asia/Shanghai',
    updatedAt: history.updatedAt,
    weekCount: history.weeks?.length || 0,
    site: history.site || { pageviews: 0, visits: 0 },
    paths: history.paths || {},
    // Pointer for charts / debugging
    historyUrl: '/analytics/cloudflare-history.json',
  };
}

function canFetch() {
  return Boolean(accountTag && apiToken && siteTag);
}

async function main() {
  let history = (await readJson(historyPath)) || emptyHistory();
  if (!history.weeks) history.weeks = [];
  history.accumulateSince = history.accumulateSince || ACCUMULATE_SINCE;
  history.accumulateSinceLabel = history.accumulateSinceLabel || ACCUMULATE_SINCE_LABEL;
  history.timezone = 'Asia/Shanghai';

  const wantFetch = doWeekly || (doBootstrap && history.weeks.length === 0);

  if (wantFetch && !canFetch()) {
    console.warn('[cf-analytics] secrets missing — cannot fetch; rewriting display from history only');
  } else if (wantFetch && canFetch()) {
    try {
      let since;
      let until;
      let weekId;
      let partial = false;

      if (doWeekly) {
        // Cron at Monday 00:00 Beijing: record the week that just ended.
        const thisMonday = beijingWeekStart(new Date());
        until = thisMonday;
        since = addDaysUtc(thisMonday, -7);
        weekId = beijingYmd(since);
      } else {
        // Bootstrap: from accumulateSince to now, tagged with current Beijing week's Monday.
        since = new Date(ACCUMULATE_SINCE);
        until = new Date();
        weekId = beijingYmd(beijingWeekStart(until));
        partial = true;
      }

      // Don't start before accumulateSince
      const accStart = new Date(ACCUMULATE_SINCE);
      if (since < accStart) since = accStart;

      console.log(`[cf-analytics] fetching weekId=${weekId} ${toIsoZ(since)} → ${toIsoZ(until)} partial=${partial}`);
      const snap = await fetchWindow(since, until);
      const week = {
        weekId,
        label: `${weekId} ~ ${beijingYmd(until)}`,
        since: toIsoZ(since),
        until: toIsoZ(until),
        fetchedAt: new Date().toISOString(),
        partial,
        site: snap.site,
        paths: snap.paths,
      };
      history.weeks = upsertWeek(history.weeks, week);
      console.log(`[cf-analytics] week ${weekId}: pageviews=${snap.site.pageviews} visits=${snap.site.visits}`);
    } catch (e) {
      console.error('[cf-analytics] fetch failed:', e.message || e);
      if (!history.weeks.length) {
        await writeJson(displayPath, {
          ok: false,
          reason: 'graphql-error',
          fetchedAt: new Date().toISOString(),
        });
        process.exit(0);
      }
      // Keep prior history on transient failure
    }
  } else {
    console.log('[cf-analytics] skip fetch (set CF_WEEKLY_UPDATE=1 or CF_BOOTSTRAP=1 to pull)');
  }

  const summed = sumWeeks(history.weeks);
  history.ok = true;
  history.source = 'cloudflare-web-analytics-cumulative';
  history.site = summed.site;
  history.paths = summed.paths;
  history.updatedAt = new Date().toISOString();

  await writeJson(historyPath, history);
  await writeJson(displayPath, toDisplay(history));
  console.log(
    `[cf-analytics] cumulative since ${history.accumulateSinceLabel}: pageviews=${history.site.pageviews} visits=${history.site.visits} weeks=${history.weeks.length}`,
  );
}

await main();
