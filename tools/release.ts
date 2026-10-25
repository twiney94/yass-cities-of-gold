import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { commitMessages, parseCommit, versionFrom } from './version.ts';

// Players care about what changed in the game, so the notes list features and fixes and leave the rest out.
const SECTIONS: [title: string, types: string[]][] = [
  ['Features', ['feat']],
  ['Fixes', ['fix', 'perf']],
];

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Newest first, like a changelog; messages come oldest first, as git log --reverse lists them.
export const releaseNotes = (messages: readonly string[]): string => {
  const commits = messages.flatMap((message) => parseCommit(message) ?? []).reverse();
  return SECTIONS.flatMap(([title, types]) => {
    const lines = commits
      .filter((commit) => types.includes(commit.type))
      .map((commit) => `- ${commit.scope ? `${capitalize(commit.scope)}: ` : ''}${capitalize(commit.description)}${commit.breaking ? ' (breaking)' : ''}`);
    return lines.length ? [`### ${title}\n\n${lines.join('\n')}`] : [];
  }).join('\n\n');
};

const previousTag = () => {
  try {
    return execFileSync('git', ['describe', '--tags', '--abbrev=0', '--match', 'v*'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

// node tools/release.ts <notes file>: prints the tag for HEAD's version and writes its notes, or prints nothing when the
// version has not moved since the last release.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
  const tag = `v${versionFrom(version, commitMessages())}`;
  const previous = previousTag();
  if (previous !== tag) {
    writeFileSync(process.argv[2]!, releaseNotes(commitMessages(previous ? `${previous}..HEAD` : undefined)) || 'Maintenance release.');
    console.log(tag);
  }
}
