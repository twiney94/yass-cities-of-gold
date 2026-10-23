import { describe, expect, it } from 'vitest';
import { type Seat, nextViewer } from './store';

const human = (color: Seat['color']): Seat => ({ kind: 'human', color });
const bot = (color: Seat['color']): Seat => ({ kind: 'bot', level: 'normal', color });

describe('nextViewer', () => {
  it("keeps the human's hand on screen while a bot plays", () => {
    const seats = [human('red'), bot('blue'), bot('white')];

    expect(nextViewer(seats, 1, 0)).toBe(0);
    expect(nextViewer(seats, 2, 0)).toBe(0);
  });

  it('hands the screen to the next human', () => {
    const seats = [human('red'), bot('blue'), human('white')];

    expect(nextViewer(seats, 2, 0)).toBe(2);
  });

  it('follows the turn when only bots play', () => {
    const seats = [bot('red'), bot('blue')];

    expect(nextViewer(seats, 1, 0)).toBe(1);
  });
});
