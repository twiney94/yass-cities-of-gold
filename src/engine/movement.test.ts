import { describe, expect, it } from 'vitest';
import type { Target } from './actions';
import type { Blockade } from './board';
import type { HexKey } from './hex';
import { at, trackBoard } from './testing/boards';
import { addPiece, ids, newGame, placePiece, rejection, run, setDrawPile, setHand, types } from './testing/fixtures';

const game = (track: string, blockades: Blockade[] = []) => {
  const state = newGame(trackBoard(track, blockades));
  placePiece(state, 0, at(0));
  return state;
};

const space = (hex: HexKey): Target => ({ kind: 'space', hex });
const blockade = (id: number): Target => ({ kind: 'blockade', id });
const machete1Blockade: Blockade = { id: 4, tiles: ['T0', 'T1'], requirement: { kind: 'landscape', suit: 'machete', power: 1 } };

describe('moving with a card', () => {
  it('spends one card across several matching spaces (Pioneer: 1 + 2 + 2)', () => {
    const state = game('G1 G1 G2 G2 G1');
    const [pioneer] = setHand(state, 0, 'pioneer');

    const after = run(
      state,
      { type: 'playForMovement', cardId: pioneer!.id, pieceId: 0 },
      { type: 'step', target: space(at(1)) },
      { type: 'step', target: space(at(2)) },
      { type: 'step', target: space(at(3)) },
    ).state;

    expect(after.pieces[0]!.at).toBe(at(3));
    expect(rejection(after, { type: 'step', target: space(at(4)) })).toBe('Not enough power left on this card');
  });

  it('cannot combine cards to enter a space with high power', () => {
    const state = game('G1 G3');
    const [first, second] = setHand(state, 0, 'explorer', 'explorer');

    const withOne = run(state, { type: 'playForMovement', cardId: first!.id, pieceId: 0 }).state;
    const withTwo = run(withOne, { type: 'playForMovement', cardId: second!.id, pieceId: 0 }).state;

    expect(rejection(withOne, { type: 'step', target: space(at(1)) })).toBe('Not enough power left on this card');
    expect(rejection(withTwo, { type: 'step', target: space(at(1)) })).toBe('Not enough power left on this card');
  });

  it('needs the symbol shown on the space', () => {
    const state = game('G1 B1');
    const [explorer] = setHand(state, 0, 'explorer');

    const after = run(state, { type: 'playForMovement', cardId: explorer!.id, pieceId: 0 }).state;

    expect(rejection(after, { type: 'step', target: space(at(1)) })).toBe('This space needs paddle');
  });

  it('lets a joker take the symbol chosen when it is played', () => {
    const state = game('G1 B1');
    const [jack] = setHand(state, 0, 'jackOfAllTrades');

    expect(rejection(state, { type: 'playForMovement', cardId: jack!.id, pieceId: 0 })).toBe('Choose a symbol for this joker');
    const after = run(
      state,
      { type: 'playForMovement', cardId: jack!.id, pieceId: 0, suit: 'paddle' },
      { type: 'step', target: space(at(1)) },
    ).state;
    expect(after.pieces[0]!.at).toBe(at(1));
  });

  it('loses the leftover power when another card is played for movement', () => {
    const state = game('G1 G1 G1 G1');
    const [scout, explorer] = setHand(state, 0, 'scout', 'explorer');

    const after = run(
      state,
      { type: 'playForMovement', cardId: scout!.id, pieceId: 0 },
      { type: 'step', target: space(at(1)) },
      { type: 'playForMovement', cardId: explorer!.id, pieceId: 0 },
      { type: 'step', target: space(at(2)) },
    ).state;

    expect(rejection(after, { type: 'step', target: space(at(3)) })).toBe('Not enough power left on this card');
  });

  it('keeps the leftover power when an action card is played mid-move', () => {
    const state = game('G1 G1 G1');
    const [scout, cartographer] = setHand(state, 0, 'scout', 'cartographer');
    setDrawPile(state, 0, 'traveler', 'traveler');

    const after = run(
      state,
      { type: 'playForMovement', cardId: scout!.id, pieceId: 0 },
      { type: 'step', target: space(at(1)) },
      { type: 'playAction', cardId: cartographer!.id },
      { type: 'step', target: space(at(2)) },
    ).state;

    expect(after.pieces[0]!.at).toBe(at(2));
  });

  it('never enters mountains', () => {
    const state = game('G1 M');
    const [explorer] = setHand(state, 0, 'explorer');

    const after = run(state, { type: 'playForMovement', cardId: explorer!.id, pieceId: 0 }).state;

    expect(rejection(after, { type: 'step', target: space(at(1)) })).toBe('Mountains can never be entered');
  });

  it('never enters a space taken by another piece, your own included', () => {
    const state = game('G1 G1 G1');
    const ownSecond = addPiece(state, 0, at(1));
    placePiece(state, 1, at(2));
    const [first, second] = setHand(state, 0, 'explorer', 'explorer');

    const ownBlocked = run(state, { type: 'playForMovement', cardId: first!.id, pieceId: 0 }).state;
    const opponentBlocked = run(state, { type: 'playForMovement', cardId: second!.id, pieceId: ownSecond }).state;

    expect(rejection(ownBlocked, { type: 'step', target: space(at(1)) })).toBe('That space is occupied');
    expect(rejection(opponentBlocked, { type: 'step', target: space(at(2)) })).toBe('That space is occupied');
  });

  it('never returns to a starting space', () => {
    const state = game('G1 G1');
    placePiece(state, 0, at(2, 2));
    const [native] = setHand(state, 0, 'native');

    expect(rejection(state, { type: 'playNative', cardId: native!.id, pieceId: 0, target: space(at(3, 2)) })).toBe(
      'Starting spaces cannot be entered',
    );
  });

  it('applies each card to one piece of your choice when you have several', () => {
    const state = game('G1 G1 . G1 G1');
    const ownSecond = addPiece(state, 0, at(3));
    const [first, second] = setHand(state, 0, 'explorer', 'explorer');

    const after = run(
      state,
      { type: 'playForMovement', cardId: first!.id, pieceId: 0 },
      { type: 'step', target: space(at(1)) },
      { type: 'playForMovement', cardId: second!.id, pieceId: ownSecond },
      { type: 'step', target: space(at(4)) },
    ).state;

    expect([after.pieces[0]!.at, after.pieces[ownSecond]!.at]).toEqual([at(1), at(4)]);
    expect(rejection(state, { type: 'playForMovement', cardId: first!.id, pieceId: 1 })).toBe('That is not your piece');
  });
});

describe('rubble and base camps', () => {
  it('enters rubble with exactly as many cards as symbols; those cards are discarded', () => {
    const state = game('G1 R2');
    const [traveler, sailor] = setHand(state, 0, 'traveler', 'sailor', 'explorer');

    expect(rejection(state, { type: 'payCards', pieceId: 0, target: space(at(1)), cardIds: [traveler!.id] })).toBe(
      'Play exactly 2 card(s) for this space',
    );
    const after = run(state, { type: 'payCards', pieceId: 0, target: space(at(1)), cardIds: ids([traveler!, sailor!]) }).state;

    expect(after.pieces[0]!.at).toBe(at(1));
    expect(types(after.players[0]!.played)).toEqual(['traveler', 'sailor']);
    expect(types(after.players[0]!.hand)).toEqual(['explorer']);
  });

  it('ends the movement of the card in play', () => {
    const state = game('G1 G1 R1 G1');
    const [scout, traveler] = setHand(state, 0, 'scout', 'traveler');

    const after = run(
      state,
      { type: 'playForMovement', cardId: scout!.id, pieceId: 0 },
      { type: 'step', target: space(at(1)) },
      { type: 'payCards', pieceId: 0, target: space(at(2)), cardIds: [traveler!.id] },
    ).state;

    expect(rejection(after, { type: 'step', target: space(at(3)) })).toBe('Play a card for movement first');
  });

  it('removes the cards played for a base camp from the game', () => {
    const state = game('G1 C1');
    const [traveler] = setHand(state, 0, 'traveler');

    const after = run(state, { type: 'payCards', pieceId: 0, target: space(at(1)), cardIds: [traveler!.id] }).state;

    expect(types(after.box)).toEqual(['traveler']);
    expect(after.players[0]!.played).toEqual([]);
  });

  it('does not take movement power', () => {
    const state = game('G1 R1');
    const [pioneer] = setHand(state, 0, 'pioneer');

    const after = run(state, { type: 'playForMovement', cardId: pioneer!.id, pieceId: 0 }).state;

    expect(rejection(after, { type: 'step', target: space(at(1)) })).toBe(
      'This space is entered by playing cards, not movement power',
    );
  });
});

describe('single-use items', () => {
  it('leave the game once their function is used', () => {
    const state = game('G1 G1');
    const [giantMachete] = setHand(state, 0, 'giantMachete');

    const after = run(state, { type: 'playForMovement', cardId: giantMachete!.id, pieceId: 0 }).state;

    expect(types(after.box)).toEqual(['giantMachete']);
    expect(after.players[0]!.played).toEqual([]);
  });

  it('are discarded as usual when played without their function', () => {
    const state = game('G1 R1');
    const [giantMachete] = setHand(state, 0, 'giantMachete');

    const after = run(state, { type: 'payCards', pieceId: 0, target: space(at(1)), cardIds: [giantMachete!.id] }).state;

    expect(after.box).toEqual([]);
    expect(types(after.players[0]!.played)).toEqual(['giantMachete']);
  });
});

describe('blockades', () => {
  it('block the border between two tiles until someone breaks them', () => {
    const state = game('G1 | G2 G1', [machete1Blockade]);
    const [explorer] = setHand(state, 0, 'explorer');

    const after = run(state, { type: 'playForMovement', cardId: explorer!.id, pieceId: 0 }).state;

    expect(rejection(after, { type: 'step', target: space(at(1)) })).toBe('A blockade is in the way');
  });

  it('work like a space: leftover power carries on into the next tile (Trailblazer 3 = blockade 1 + space 2)', () => {
    const state = game('G1 | G2 G1', [machete1Blockade]);
    const [trailblazer] = setHand(state, 0, 'trailblazer');

    const { state: after, events } = run(
      state,
      { type: 'playForMovement', cardId: trailblazer!.id, pieceId: 0 },
      { type: 'step', target: blockade(4) },
      { type: 'step', target: space(at(1)) },
    );

    expect(after.pieces[0]!.at).toBe(at(1));
    expect(after.blockades).toEqual([]);
    expect(after.players[0]!.blockades).toEqual([4]);
    expect(events).toContainEqual({ type: 'blockadeBroken', player: 0, blockadeId: 4 });
  });

  it('can only be broken from a space next to them', () => {
    const state = game('G1 G1 | G1', [machete1Blockade]);
    const [explorer] = setHand(state, 0, 'explorer');

    const after = run(state, { type: 'playForMovement', cardId: explorer!.id, pieceId: 0 }).state;

    expect(rejection(after, { type: 'step', target: blockade(4) })).toBe('Your piece is not next to that blockade');
  });

  it('take cards when they show rubble, and the piece stays where it is', () => {
    const rubble: Blockade = { id: 6, tiles: ['T0', 'T1'], requirement: { kind: 'rubble', cards: 2 } };
    const state = game('G1 | G1', [rubble]);
    const cards = setHand(state, 0, 'traveler', 'sailor');

    const after = run(state, { type: 'payCards', pieceId: 0, target: blockade(6), cardIds: ids(cards) }).state;

    expect(after.blockades).toEqual([]);
    expect(after.pieces[0]!.at).toBe(at(0));
    expect(types(after.players[0]!.played)).toEqual(['traveler', 'sailor']);
  });
});

describe('Native', () => {
  it('moves one space ignoring its requirement (rubble 3 for free)', () => {
    const state = game('G1 R3');
    const [native] = setHand(state, 0, 'native');

    const after = run(state, { type: 'playNative', cardId: native!.id, pieceId: 0, target: space(at(1)) }).state;

    expect(after.pieces[0]!.at).toBe(at(1));
    expect(types(after.players[0]!.played)).toEqual(['native']);
  });

  it('enters a base camp without removing any card', () => {
    const state = game('G1 C2');
    const [native] = setHand(state, 0, 'native');

    const after = run(state, { type: 'playNative', cardId: native!.id, pieceId: 0, target: space(at(1)) }).state;

    expect(after.box).toEqual([]);
  });

  it('cannot enter mountains or occupied spaces', () => {
    const state = game('G1 M G1');
    const [native] = setHand(state, 0, 'native');

    expect(rejection(state, { type: 'playNative', cardId: native!.id, pieceId: 0, target: space(at(1)) })).toBe(
      'Mountains can never be entered',
    );
    placePiece(state, 0, at(2));
    placePiece(state, 1, at(1));
    expect(rejection(state, { type: 'playNative', cardId: native!.id, pieceId: 0, target: space(at(1)) })).toBe(
      'That space is occupied',
    );
  });

  it('tears down a blockade', () => {
    const state = game('G1 | G1', [machete1Blockade]);
    const [native] = setHand(state, 0, 'native');

    const after = run(state, { type: 'playNative', cardId: native!.id, pieceId: 0, target: blockade(4) }).state;

    expect(after.blockades).toEqual([]);
    expect(after.players[0]!.blockades).toEqual([4]);
  });

  it('ends the movement of the card in play', () => {
    const state = game('G1 G1 G1 G1');
    const [scout, native] = setHand(state, 0, 'scout', 'native');

    const after = run(
      state,
      { type: 'playForMovement', cardId: scout!.id, pieceId: 0 },
      { type: 'step', target: space(at(1)) },
      { type: 'playNative', cardId: native!.id, pieceId: 0, target: space(at(2)) },
    ).state;

    expect(rejection(after, { type: 'step', target: space(at(3)) })).toBe('Play a card for movement first');
  });
});
