#!/usr/bin/env node
/**
 * Cloudflare Web Analytics → cumulative totals + weekly snapshots.
 *
 * Env:
 *   CF_ACCOUNT_ID, CF_API_TOKEN, CF_SITE_TAG
 *   CF_WEEKLY_UPDATE=1  append/upsert one Sunday snapshot (last 7 days)
 *   CF_BOOTSTRAP=1     if history empty, seed one snapshot now
 *
 * Without UPDATE: rebuild display JSON from existing history only.
 *
 * Snapshot id = Beijing Sunday date as YYYYMMDD (e.g. 20260816).
 * Cron: Sunday ~23:59 Asia/Shanghai. If Actions runs late into Monday,
 * we still attribute the snapshot to the most recent Sunday.
 *
 * Writes:
 *   public/analytics/cloudflare-history.json
 *   public/analytics/cloudflare.json
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

function beijingParts(d = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    })
      .formatToParts(d)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  );
  const y = Number(parts.year);
  const m = Number(parts.month);
  const day = Number(parts.day);
  const weekday = parts.weekday; // Mon Tue ...
  return { y, m, day, weekday, ymd: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
}

/** Most recent Sunday in Asia/Shanghai (today if Sunday). */
function mostRecentBeijingSunday(d = new Date()) {
  const { y, m, day, weekday } = beijingParts(d);
  const back = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday] ?? 0;
  // Noon CST probe day, then subtract `back` days → Sunday calendar date
  const noonUtc = Date.UTC(y, m - 1, day, 4, 0, 0); // 12:00 CST
  const sundayNoon = new Date(noonUtc - back * 86400000);
  const sp = beijingParts(sundayNoon);
  // Sunday 00:00 CST = Sat 16:00 UTC
  const start = new Date(Date.UTC(sp.y, sp.m - 1, sp.day, -8, 0, 0));
  return {
    start, // Sunday 00:00 CST
    end: new Date(start.getTime() + 7 * 86400000), // next Sunday 00:00 CST
    // Collection label: that Sunday as YYYYMMDD
    id: `${sp.y}${String(sp.m).padStart(2, '0')}${String(sp.day).padStart(2, '0')}`,
    ymd: sp.ymd,
  };
}

/** Week window for a Sunday collection: Mon 00:00 → next Mon 00:00 (contains that Sunday). */
function weekWindowForSunday(sundayStart) {
  // sundayStart is Sunday 00:00 CST; Monday of that week is -6 days? 
  // Calendar week Mon–Sun: Monday = Sunday - 6 days.
  const monday = new Date(sundayStart.getTime() - 6 * 86400000);
  const nextMonday = new Date(monday.getTime() + 7 * 86400000);
  return { since: monday, until: nextMonday };
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
  if (key !== '/') {
    map[`${key}/`] = { pageviews: cur.pageviews, visits: cur.visits };
  }
}

function mergePaths(into, from) {
  for (const [k, v] of Object.entries(from || {})) {
    if (k.endsWith('/') && k !== '/') continue;
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
    throw new Error(`GraphQL failed: ${res.status} ${JSON.stringify(body?.errors || body)}`);
  }
  const account = body.data?.viewer?.accounts?.[0];
  const totalsRow = account?.totals?.[0];
  const paths = {};
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

function sumSnapshots(snapshots) {
  const site = { pageviews: 0, visits: 0 };
  const paths = {};
  for (const s of snapshots) {
    site.pageviews += Number(s.site?.pageviews) || 0;
    site.visits += Number(s.site?.visits) || 0;
    mergePaths(paths, s.paths);
  }
  return { site, paths };
}

function upsertSnapshot(snapshots, snap) {
  const i = snapshots.findIndex((s) => s.id === snap.id);
  if (i >= 0) snapshots[i] = snap;
  else snapshots.push(snap);
  snapshots.sort((a, b) => a.id.localeCompare(b.id));
  return snapshots;
}

/** Migrate old weeks[] shape → snapshots[]. */
function normalizeHistory(raw) {
  const base = {
    ok: true,
    source: 'cloudflare-web-analytics-cumulative',
    timezone: 'Asia/Shanghai',
    accumulateSince: ACCUMULATE_SINCE,
    accumulateSinceLabel: ACCUMULATE_SINCE_LABEL,
    updatedAt: null,
    site: { pageviews: 0, visits: 0 },
    paths: {},
    snapshots: [],
  };
  if (!raw || typeof raw !== 'object') return base;

  let snapshots = Array.isArray(raw.snapshots) ? [...raw.snapshots] : [];
  if (!snapshots.length && Array.isArray(raw.weeks)) {
    // Drop bogus Monday-keyed empty points; keep real data as best-effort.
    for (const w of raw.weeks) {
      const pv = Number(w.site?.pageviews) || 0;
      const visits = Number(w.site?.visits) || 0;
      if (pv === 0 && visits === 0) continue;
      // Old weekId was Monday YYYY-MM-DD → map to that week's Sunday YYYYMMDD
      let id = w.weekId;
      if (/^\d{4}-\d{2}-\d{2}$/.test(id)) {
        const [y, m, d] = id.split('-').map(Number);
        const monday = new Date(Date.UTC(y, m - 1, d, -8, 0, 0));
        const sunday = new Date(monday.getTime() + 6 * 86400000);
        const sp = beijingParts(sunday);
        id = `${sp.y}${String(sp.m).padStart(2, '0')}${String(sp.day).padStart(2, '0')}`;
      }
      snapshots.push({
        id,
        fetchedAt: w.fetchedAt || null,
        since: w.since,
        until: w.until,
        site: w.site,
        paths: w.paths || {},
      });
    }
  }

  return {
    ...base,
    ...raw,
    accumulateSince: raw.accumulateSince || ACCUMULATE_SINCE,
    accumulateSinceLabel: raw.accumulateSinceLabel || ACCUMULATE_SINCE_LABEL,
    snapshots,
    weeks: undefined,
  };
}

function toDisplay(history) {
  return {
    ok: Boolean(history?.ok) && Array.isArray(history.snapshots),
    source: 'cloudflare-web-analytics-cumulative',
    mode: 'cumulative',
    accumulateSince: history.accumulateSince,
    accumulateSinceLabel: history.accumulateSinceLabel,
    timezone: history.timezone || 'Asia/Shanghai',
    updatedAt: history.updatedAt,
    snapshotCount: history.snapshots?.length || 0,
    site: history.site || { pageviews: 0, visits: 0 },
    paths: history.paths || {},
    historyUrl: '/analytics/cloudflare-history.json',
  };
}

function canFetch() {
  return Boolean(accountTag && apiToken && siteTag);
}

async function main() {
  let history = normalizeHistory(await readJson(historyPath));
  history.timezone = 'Asia/Shanghai';

  const wantFetch = doWeekly || (doBootstrap && history.snapshots.length === 0);

  if (wantFetch && !canFetch()) {
    console.warn('[cf-analytics] secrets missing — cannot fetch; rewriting display from history only');
  } else if (wantFetch && canFetch()) {
    try {
      const sunday = mostRecentBeijingSunday(new Date());
      let since;
      let until;
      let id = sunday.id;

      if (history.snapshots.length === 0 && doBootstrap && !doWeekly) {
        since = new Date(ACCUMULATE_SINCE);
        until = new Date();
        const sp = beijingParts(until);
        id = `${sp.y}${String(sp.m).padStart(2, '0')}${String(sp.day).padStart(2, '0')}`;
      } else {
        const win = weekWindowForSunday(sunday.start);
        since = win.since;
        until = win.until;
        id = sunday.id;
        if (since < new Date(ACCUMULATE_SINCE)) since = new Date(ACCUMULATE_SINCE);
      }

      console.log(`[cf-analytics] snapshot id=${id} ${toIsoZ(since)} → ${toIsoZ(until)}`);
      const snapData = await fetchWindow(since, until);
      const snap = {
        id,
        fetchedAt: new Date().toISOString(),
        since: toIsoZ(since),
        until: toIsoZ(until),
        site: snapData.site,
        paths: snapData.paths,
      };
      history.snapshots = upsertSnapshot(history.snapshots, snap);
      console.log(`[cf-analytics] ${id}: pageviews=${snap.site.pageviews} visits=${snap.site.visits}`);
    } catch (e) {
      console.error('[cf-analytics] fetch failed:', e.message || e);
      if (!history.snapshots.length) {
        await writeJson(displayPath, {
          ok: false,
          reason: 'graphql-error',
          fetchedAt: new Date().toISOString(),
        });
        process.exit(0);
      }
    }
  } else {
    console.log('[cf-analytics] skip fetch (set CF_WEEKLY_UPDATE=1 to pull)');
  }

  const summed = sumSnapshots(history.snapshots);
  history.ok = true;
  history.source = 'cloudflare-web-analytics-cumulative';
  history.site = summed.site;
  history.paths = summed.paths;
  history.updatedAt = new Date().toISOString();
  delete history.weeks;

  await writeJson(historyPath, history);
  await writeJson(displayPath, toDisplay(history));
  console.log(
    `[cf-analytics] cumulative since ${history.accumulateSinceLabel}: pageviews=${history.site.pageviews} visits=${history.site.visits} snapshots=${history.snapshots.length}`,
  );
}

await main();
