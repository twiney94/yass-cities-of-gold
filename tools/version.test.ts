import { describe, expect, it } from 'vitest';
import { bumpOf, versionFrom } from './version.ts';

describe('bumpOf', () => {
  it('reads the bump from the commit type, with or without a scope', () => {
    expect(bumpOf('feat: start the intro without the tap screen')).toBe('minor');
    expect(bumpOf('feat(menu): flags for the languages')).toBe('minor');
    expect(bumpOf('fix: keep card styles out of other rules')).toBe('patch');
    expect(bumpOf('perf: draw the board once')).toBe('patch');
    expect(bumpOf('chore: number builds from commits')).toBeNull();
    expect(bumpOf('docs: explain versions')).toBeNull();
  });

  it('treats a bang or a BREAKING CHANGE note as a major change', () => {
    expect(bumpOf('feat!: new save format')).toBe('major');
    expect(bumpOf('fix(save)!: drop old saves')).toBe('major');
    expect(bumpOf('refactor: new save format\n\nBREAKING CHANGE: old saves no longer load')).toBe('major');
  });

  it('ignores messages without a conventional header', () => {
    expect(bumpOf('Fix misplaced card styles')).toBeNull();
    expect(bumpOf('feature: something')).toBeNull();
  });
});

describe('versionFrom', () => {
  it('starts from the base and applies every bump in order, keeping the pre-release label', () => {
    const messages = ['Redraw the pawns', 'feat: tap to open the slider', 'fix: instant mute', 'fix: label size', 'chore: deps', 'feat: flags'];
    expect(versionFrom('0.2.0-alpha', messages)).toBe('0.4.0-alpha');
    expect(versionFrom('0.2.0-alpha', messages.slice(0, 4))).toBe('0.3.2-alpha');
  });

  it('resets the lower numbers on a bigger bump', () => {
    expect(versionFrom('1.4.2', ['fix: a', 'feat!: b', 'fix: c'])).toBe('2.0.1');
  });

  it('stays on the base while no commit asks for a bump', () => {
    expect(versionFrom('0.2.0-alpha', ['Initial commit', 'chore: tidy'])).toBe('0.2.0-alpha');
  });
});
