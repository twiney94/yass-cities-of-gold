import { describe, expect, it } from 'vitest';
import { ALL_CARDS, CARDS, COPIES_PER_MARKET_PILE } from './cards';

describe('card catalog', () => {
  it('gives each player a starting deck of 1 Sailor, 3 Explorers and 4 Travelers', () => {
    const starters = ALL_CARDS.flatMap((card) =>
      card.supply.from === 'starterDeck' ? [[card.type, card.supply.copies] as const] : [],
    );

    expect(Object.fromEntries(starters)).toEqual({ sailor: 1, explorer: 3, traveler: 4 });
  });

  it('puts 18 card types and 54 cards in the marketplace', () => {
    const marketTypes = ALL_CARDS.filter((card) => card.supply.from !== 'starterDeck');

    expect(marketTypes).toHaveLength(18);
    expect(marketTypes.length * COPIES_PER_MARKET_PILE).toBe(54);
  });

  it('starts the market board with 6 piles', () => {
    const onBoard = ALL_CARDS.filter((card) => card.supply.from === 'marketBoard').map((card) => card.type);

    expect(onBoard).toEqual(['scout', 'trailblazer', 'photographer', 'treasureChest', 'jackOfAllTrades', 'transmitter']);
  });

  it('marks the item cards as single use', () => {
    const singleUse = ALL_CARDS.filter((card) => card.singleUse).map((card) => card.type);

    expect(singleUse).toEqual(['giantMachete', 'treasureChest', 'propPlane', 'transmitter', 'travelLog', 'compass']);
  });

  it('matches the confirmed powers', () => {
    expect(CARDS.giantMachete.face).toEqual({ kind: 'expedition', suit: 'machete', power: 6 });
    expect(CARDS.photographer.face).toEqual({ kind: 'expedition', suit: 'coin', power: 2 });
    expect(CARDS.jackOfAllTrades.face).toEqual({ kind: 'joker', power: 1 });
    expect(CARDS.journalist.face).toEqual({ kind: 'expedition', suit: 'coin', power: 3 });
  });
});
