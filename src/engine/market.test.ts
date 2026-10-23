import { describe, expect, it } from 'vitest';
import { at, trackBoard } from './testing/boards';
import { ids, newGame, placePiece, rejection, run, setHand, types } from './testing/fixtures';

const game = () => {
  const state = newGame(trackBoard('G1 G1'));
  placePiece(state, 0, at(0));
  return state;
};

describe('buying', () => {
  it('adds up coins, counting non-coin cards as half a coin (rulebook: 1 + 2 + ½ + ½ = 4)', () => {
    const state = game();
    const hand = setHand(state, 0, 'traveler', 'photographer', 'explorer', 'sailor');

    const { state: after, events } = run(state, { type: 'buy', cardType: 'transmitter', cardIds: ids(hand) });

    expect(types(after.players[0]!.discard)).toEqual(['transmitter']);
    expect(types(after.players[0]!.played)).toEqual(['traveler', 'photographer', 'explorer', 'sailor']);
    expect(after.market.remaining.transmitter).toBe(2);
    expect(events).toContainEqual(expect.objectContaining({ type: 'cardGained', via: 'purchase' }));
  });

  it('gives no credit for a payment that falls short', () => {
    const state = game();
    const hand = setHand(state, 0, 'traveler', 'photographer', 'explorer');

    expect(rejection(state, { type: 'buy', cardType: 'transmitter', cardIds: ids(hand) })).toBe('Transmitter costs 4 coins');
  });

  it('counts jokers and coin items at full value, removing the items used', () => {
    const state = game();
    const [chest, jack, photographer] = setHand(state, 0, 'treasureChest', 'jackOfAllTrades', 'photographer');

    const withChest = run(state, { type: 'buy', cardType: 'trailblazer', cardIds: [chest!.id] }).state;
    const withJoker = run(state, { type: 'buy', cardType: 'trailblazer', cardIds: [jack!.id, photographer!.id] }).state;

    expect(types(withChest.box)).toEqual(['treasureChest']);
    expect(types(withJoker.players[0]!.played)).toEqual(['jackOfAllTrades', 'photographer']);
  });

  it('keeps a coin item spent as half a coin when its full value is not needed', () => {
    const state = game();
    const [photographer, chest] = setHand(state, 0, 'photographer', 'treasureChest');

    const after = run(state, { type: 'buy', cardType: 'photographer', cardIds: [photographer!.id, chest!.id] }).state;

    expect(after.box).toEqual([]);
    expect(types(after.players[0]!.played)).toEqual(['photographer', 'treasureChest']);
  });

  it('spends a coin item in full only when the purchase needs it', () => {
    const state = game();
    const [traveler, plane] = setHand(state, 0, 'traveler', 'propPlane');

    const after = run(state, { type: 'buy', cardType: 'photographer', cardIds: [traveler!.id, plane!.id] }).state;

    expect(types(after.box)).toEqual(['propPlane']);
  });

  it('keeps other items spent as half a coin', () => {
    const state = game();
    const [machete, traveler] = setHand(state, 0, 'giantMachete', 'traveler');

    const after = run(state, { type: 'buy', cardType: 'scout', cardIds: [machete!.id, traveler!.id] }).state;

    expect(after.box).toEqual([]);
    expect(types(after.players[0]!.played)).toEqual(['giantMachete', 'traveler']);
  });

  it('allows one purchase per turn, and no movement after it', () => {
    const state = game();
    const [traveler, other, explorer] = setHand(state, 0, 'traveler', 'traveler', 'explorer');

    const after = run(state, { type: 'buy', cardType: 'scout', cardIds: [traveler!.id] }).state;

    expect(rejection(after, { type: 'buy', cardType: 'scout', cardIds: [other!.id] })).toBe('You can only buy one card per turn');
    expect(rejection(after, { type: 'playForMovement', cardId: explorer!.id, pieceId: 0 })).toBe('You cannot move after buying');
  });

  it('keeps the reserve closed while every market slot is filled', () => {
    const state = game();
    const hand = setHand(state, 0, 'photographer');

    expect(rejection(state, { type: 'buy', cardType: 'captain', cardIds: ids(hand) })).toBe(
      'Reserve cards unlock once a market pile sells out',
    );
  });

  it('frees a slot when its last card is sold', () => {
    const state = game();
    state.market.remaining.scout = 1;
    const hand = setHand(state, 0, 'traveler');

    const after = run(state, { type: 'buy', cardType: 'scout', cardIds: ids(hand) }).state;

    expect(after.market.slots[0]).toBeNull();
    expect(after.market.remaining.scout).toBe(0);
  });

  it('sells from the reserve once a slot is free, moving that pile onto it', () => {
    const state = game();
    state.market.slots[0] = null;
    state.market.remaining.scout = 0;
    const hand = setHand(state, 0, 'photographer');

    const { state: after, events } = run(state, { type: 'buy', cardType: 'captain', cardIds: ids(hand) });

    expect(after.market.slots[0]).toBe('captain');
    expect(after.market.remaining.captain).toBe(2);
    expect(events).toContainEqual({ type: 'marketPileMoved', cardType: 'captain', slot: 0 });
  });

  it('never sells starting cards', () => {
    const state = game();
    const hand = setHand(state, 0, 'photographer');

    expect(rejection(state, { type: 'buy', cardType: 'explorer', cardIds: ids(hand) })).toBe('Starting cards cannot be bought');
  });
});

describe('Transmitter', () => {
  it('takes any card for free, even from the closed reserve, and still leaves the purchase available', () => {
    const state = game();
    const [transmitter, traveler] = setHand(state, 0, 'transmitter', 'traveler');

    const after = run(
      state,
      { type: 'playTransmitter', cardId: transmitter!.id, take: 'pioneer' },
      { type: 'buy', cardType: 'scout', cardIds: [traveler!.id] },
    ).state;

    expect(types(after.players[0]!.discard)).toEqual(['pioneer', 'scout']);
    expect(after.market.slots).toEqual(state.market.slots);
    expect(after.market.remaining.pioneer).toBe(2);
    expect(types(after.box)).toEqual(['transmitter']);
  });

  it('moves a reserve pile onto a free slot, like a purchase would', () => {
    const state = game();
    state.market.slots[2] = null;
    const [transmitter] = setHand(state, 0, 'transmitter');

    const after = run(state, { type: 'playTransmitter', cardId: transmitter!.id, take: 'native' }).state;

    expect(after.market.slots[2]).toBe('native');
  });
});
