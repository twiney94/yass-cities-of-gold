import { execFileSync } from 'node:child_process';

// The game's version is worked out from the commit history: package.json holds the starting point, and each
// conventional commit since bumps it, a feat the minor, a fix or perf the patch and a breaking change the major.
export type Bump = 'major' | 'minor' | 'patch';

export type Commit = { type: string; scope: string | null; breaking: boolean; description: string };

const HEADER = /^(\w+)(?:\(([^)]*)\))?(!)?: (.+)/;

export const parseCommit = (message: string): Commit | null => {
  const header = HEADER.exec(message);
  if (!header) return null;
  return {
    type: header[1]!,
    scope: header[2] ?? null,
    breaking: !!header[3] || /^BREAKING[ -]CHANGE: /m.test(message),
    description: header[4]!.split('\n')[0]!.trim(),
  };
};

export const bumpOf = (message: string): Bump | null => {
  const commit = parseCommit(message);
  if (!commit) return null;
  if (commit.breaking) return 'major';
  if (commit.type === 'feat') return 'minor';
  if (commit.type === 'fix' || commit.type === 'perf') return 'patch';
  return null;
};

export const versionFrom = (base: string, messages: readonly string[]): string => {
  const [core = '', ...label] = base.split('-');
  let [major = 0, minor = 0, patch = 0] = core.split('.').map(Number);
  for (const message of messages) {
    const bump = bumpOf(message);
    if (bump === 'major') [major, minor, patch] = [major + 1, 0, 0];
    else if (bump === 'minor') [minor, patch] = [minor + 1, 0];
    else if (bump === 'patch') patch += 1;
  }
  return [`${major}.${minor}.${patch}`, ...label].join('-');
};

// Commit messages oldest first, NUL-separated so a message body can span lines; none when git is unavailable.
export const commitMessages = (range?: string): string[] => {
  try {
    const log = execFileSync('git', ['log', '--reverse', '--format=%B%x00', ...(range ? [range] : [])], { encoding: 'utf8' });
    return log
      .split('\0')
      .map((message) => message.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};
