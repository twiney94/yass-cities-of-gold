// The game's version is worked out from the commit history: package.json holds the starting point, and each
// conventional commit since bumps it, a feat the minor, a fix or perf the patch and a breaking change the major.
export type Bump = 'major' | 'minor' | 'patch';

const HEADER = /^(\w+)(?:\([^)]*\))?(!)?: /;

export const bumpOf = (message: string): Bump | null => {
  const header = HEADER.exec(message);
  if (!header) return null;
  if (header[2] || /^BREAKING[ -]CHANGE: /m.test(message)) return 'major';
  if (header[1] === 'feat') return 'minor';
  if (header[1] === 'fix' || header[1] === 'perf') return 'patch';
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
