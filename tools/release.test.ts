import { describe, expect, it } from 'vitest';
import { discordMessage, releaseNotes } from './release.ts';

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

describe('discordMessage', () => {
  it('posts the notes in a card linking to the release and the game', () => {
    const notes = '### Fixes\n\n- Make card text unselectable';
    const message = discordMessage('v0.4.1-alpha', notes, 'https://example.org/releases/v0.4.1-alpha', 'https://example.org/game/');
    expect(message.avatar_url).toBe('https://example.org/game/icons/icon-192.png');
    expect(message.embeds[0]).toEqual({
      title: "Yass' Cities of Gold v0.4.1-alpha",
      url: 'https://example.org/releases/v0.4.1-alpha',
      description: '**Fixes**\n\n- Make card text unselectable\n\n[Play now](https://example.org/game/)',
      color: 0xf2c14e,
    });
  });

  it('keeps the card under Discord\'s length limit', () => {
    const notes = `### Fixes\n\n${'- A fix\n'.repeat(1000)}`;
    expect(discordMessage('v1.0.0', notes, 'https://a/', 'https://b/').embeds[0]!.description.length).toBeLessThanOrEqual(4096);
  });
});
