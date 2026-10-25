import { describe, expect, it } from 'vitest';
import { releaseNotes } from './release.ts';

describe('releaseNotes', () => {
  it('lists features then fixes, newest first, without the type prefixes', () => {
    const messages = [
      'Redraw the pawns',
      'feat: start the intro without the tap screen on phones',
      'fix: keep removed cards inside the removed pile',
      'chore: work the version out from commits',
      'perf(board): draw the hexes once',
      'feat: show the logo over the painting in link previews',
    ];
    expect(releaseNotes(messages)).toBe(
      [
        '### Features',
        '',
        '- Show the logo over the painting in link previews',
        '- Start the intro without the tap screen on phones',
        '',
        '### Fixes',
        '',
        '- Board: Draw the hexes once',
        '- Keep removed cards inside the removed pile',
      ].join('\n'),
    );
  });

  it('marks breaking changes and keeps only the first line of each message', () => {
    expect(releaseNotes(['feat!: new save format\n\nOld saves no longer load.'])).toBe('### Features\n\n- New save format (breaking)');
  });

  it('is empty when nothing players would notice changed', () => {
    expect(releaseNotes(['chore: tidy', 'ci: lint first', 'docs: explain versions'])).toBe('');
  });
});
