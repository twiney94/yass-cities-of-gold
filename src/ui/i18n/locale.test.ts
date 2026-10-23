import { describe, expect, it } from 'vitest';
import { pickLocale } from './locale';

describe('pickLocale', () => {
  it('keeps a saved choice over the browser languages', () => {
    expect(pickLocale('en', ['fr-FR', 'fr'])).toBe('en');
  });

  it('takes the first browser language the game speaks', () => {
    expect(pickLocale(null, ['de-DE', 'fr-CA', 'en-US'])).toBe('fr');
  });

  it('falls back to English, ignoring an unknown saved value', () => {
    expect(pickLocale('es', ['es-ES', 'it'])).toBe('en');
  });
});
