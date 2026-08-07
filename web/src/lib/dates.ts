import { execSync } from 'node:child_process';

export interface GitDates {
  created?: Date;
  updated?: Date;
}

// Read a file's first (created) and last (updated) commit timestamps from git.
// Requires full history at build time (actions/checkout with fetch-depth: 0).
// Falls back gracefully (returns {}) for uncommitted files or shallow clones.
export function gitDates(relPath: string): GitDates {
  try {
    const out = execSync(`git log --follow --format=%cI -- "${relPath}"`, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!out) return {};
    const lines = out.split('\n');
    return {
      updated: new Date(lines[0]),
      created: new Date(lines[lines.length - 1]),
    };
  } catch {
    return {};
  }
}

// Format a date as e.g. "2026-08-07 14:11 UTC+8" (Asia/Shanghai).
export function fmtCN(d: Date): string {
  const s = d.toLocaleString('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return s.replace(',', '') + ' UTC+8';
}

// Whether the updated timestamp is meaningfully later than created (> 60s),
// so a "更新于 …" line is only shown for genuine edits, not the first commit.
export function isUpdated(created?: Date, updated?: Date): boolean {
  if (!created || !updated) return false;
  return updated.valueOf() - created.valueOf() > 60_000;
}
