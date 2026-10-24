import { describe, expect, it } from 'vitest';
import { at, trackBoard } from './testing/boards';
import { newGame, placePiece, rejection, run, setDiscard, setDrawPile, setHand, types } from './testing/fixtures';

const game = () => {
  const state = newGame(trackBoard('G1 G1'));
  placePiece(state, 0, at(0));
  return state;
};

describe('action cards', () => {
  it('Cartographer draws 2 cards that can be played this turn', () => {
    const state = game();
    const [cartographer] = setHand(state, 0, 'cartographer');
    setDrawPile(state, 0, 'scout', 'captain', 'traveler');

    const after = run(state, { type: 'playAction', cardId: cartographer!.id }).state;

    expect(types(after.players[0]!.hand)).toEqual(['scout', 'captain']);
    expect(types(after.players[0]!.played)).toEqual(['cartographer']);
  });

  it('reshuffles only the discard pile mid-turn, never the cards already played this turn', () => {
    const state = game();
    const [explorer, cartographer] = setHand(state, 0, 'explorer', 'cartographer');
    state.players[0]!.drawPile = [];
    setDiscard(state, 0, 'traveler', 'sailor');

    const { state: after, events } = run(
      state,
      { type: 'playForMovement', cardId: explorer!.id, pieceId: 0 },
      { type: 'playAction', cardId: cartographer!.id },
    );

    expect(types(after.players[0]!.hand).sort()).toEqual(['sailor', 'traveler']);
    expect(types(after.players[0]!.played)).toEqual(['explorer', 'cartographer']);
    expect(events).toContainEqual({ type: 'deckShuffled', player: 0 });
  });

  it('Compass draws 3 cards and leaves the game', () => {
    const state = game();
    const [compass] = setHand(state, 0, 'compass');
    setDrawPile(state, 0, 'scout', 'captain', 'traveler');

    const after = run(state, { type: 'playAction', cardId: compass!.id }).state;

    expect(after.players[0]!.hand).toHaveLength(3);
    expect(types(after.box)).toEqual(['compass']);
  });

  it('Scientist draws 1, then lets you remove up to 1 card from your hand before doing anything else', () => {
    const state = game();
    const [scientist, explorer, traveler] = setHand(state, 0, 'scientist', 'explorer', 'traveler');
    setDrawPile(state, 0, 'scout');

    const drawn = run(state, { type: 'playAction', cardId: scientist!.id }).state;

    expect(types(drawn.players[0]!.hand)).toEqual(['explorer', 'traveler', 'scout']);
    expect(rejection(drawn, { type: 'playForMovement', cardId: explorer!.id, pieceId: 0 })).toBe(
      'Choose which cards to remove first',
    );
    expect(rejection(drawn, { type: 'removeFromHand', cardIds: [explorer!.id, traveler!.id] })).toBe('Remove at most 1 card(s)');
    const after = run(drawn, { type: 'removeFromHand', cardIds: [traveler!.id] }).state;
    expect(types(after.box)).toEqual(['traveler']);
    expect(types(after.players[0]!.removed)).toEqual(['traveler']);
    expect(types(after.players[0]!.played)).toEqual(['scientist']);
    expect(after.turn.pending).toBeNull();
  });

  it('Travel Log draws 2, removes up to 2, and removes itself', () => {
    const state = game();
    const [travelLog] = setHand(state, 0, 'travelLog');
    const [first, second] = setDrawPile(state, 0, 'traveler', 'traveler');

    const after = run(
      state,
      { type: 'playAction', cardId: travelLog!.id },
      { type: 'removeFromHand', cardIds: [first!.id, second!.id] },
    ).state;

    expect(types(after.box)).toEqual(['travelLog', 'traveler', 'traveler']);
    expect(after.players[0]!.hand).toEqual([]);
  });

  it('may decline to remove anything', () => {
    const state = game();
    const [scientist] = setHand(state, 0, 'scientist');
    setDrawPile(state, 0, 'scout');

    const after = run(state, { type: 'playAction', cardId: scientist!.id }, { type: 'removeFromHand', cardIds: [] }).state;

    expect(types(after.players[0]!.hand)).toEqual(['scout']);
  });

  it('are not played for movement', () => {
    const state = game();
    const [cartographer] = setHand(state, 0, 'cartographer');

    expect(rejection(state, { type: 'playForMovement', cardId: cartographer!.id, pieceId: 0 })).toBe(
      'Action cards are not played for movement',
    );
  });
});
