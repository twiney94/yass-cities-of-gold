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

// A Discord webhook message: the notes in a gold card linking to the release, with Discord's bold for headings.
export const discordMessage = (tag: string, notes: string, releaseUrl: string, playUrl: string) => ({
  username: "Yass' Cities of Gold",
  avatar_url: new URL('icons/icon-192.png', playUrl).href,
  embeds: [
    {
      title: `Yass' Cities of Gold ${tag}`,
      url: releaseUrl,
      description: `${notes.replace(/^### (.+)$/gm, '**$1**').slice(0, 3800)}\n\n[Play now](${playUrl})`,
      color: 0xf2c14e,
    },
  ],
});

const previousTag = () => {
  try {
    return execFileSync('git', ['describe', '--tags', '--abbrev=0', '--match', 'v*'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

// node tools/release.ts <notes file>: prints the tag for HEAD's version and writes its notes, or prints nothing when the
// version has not moved since the last release.
// node tools/release.ts --discord <tag> <notes file> <release url> <play url>: prints the Discord message for them.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && process.argv[2] === '--discord') {
  const [tag, notesFile, releaseUrl, playUrl] = process.argv.slice(3) as [string, string, string, string];
  console.log(JSON.stringify(discordMessage(tag, readFileSync(notesFile, 'utf8'), releaseUrl, playUrl)));
} else if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
  const tag = `v${versionFrom(version, commitMessages())}`;
  const previous = previousTag();
  if (previous !== tag) {
    writeFileSync(process.argv[2]!, releaseNotes(commitMessages(previous ? `${previous}..HEAD` : undefined)) || 'Maintenance release.');
    console.log(tag);
  }
}
