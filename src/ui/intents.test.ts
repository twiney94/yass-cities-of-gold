import { describe, expect, it } from 'vitest';
import { at, trackBoard } from '../engine/testing/boards';
import { addPiece, newGame, placePiece, run, setDrawPile, setHand } from '../engine/testing/fixtures';
import { type Selection, cardsRemovedBy, computeIntents, keptBySelectingMore } from './intents';

const game = (track: string) => {
  const state = newGame(trackBoard(track));
  placePiece(state, 0, at(0));
  return state;
};

const selecting = (cards: number[], extra: Partial<Selection> = {}): Selection => ({ cards, pieceId: null, ...extra });

describe('computeIntents', () => {
  it('offers every space one movement card reaches, as a ready-to-run sequence', () => {
    const state = game('G1 G1 G1 B1');
    const [scout] = setHand(state, 0, 'scout');

    const intents = computeIntents(state, selecting([scout!.id]));

    expect([...intents.board.keys()]).toEqual([`space:${at(1)}`, `space:${at(2)}`]);
    expect(run(state, ...intents.board.get(`space:${at(2)}`)!).state.pieces[0]!.at).toBe(at(2));
  });

  it('keeps offering moves with the leftover power once nothing is selected', () => {
    const state = game('G1 G1 G1');
    const [scout] = setHand(state, 0, 'scout');
    const moved = run(state, ...computeIntents(state, selecting([scout!.id])).board.get(`space:${at(1)}`)!).state;

    expect([...computeIntents(moved, selecting([])).board.keys()].sort()).toEqual([`space:${at(0)}`, `space:${at(2)}`]);
  });

  it('lets a joker take whichever symbol the space needs', () => {
    const state = game('G1 B1');
    const [jack] = setHand(state, 0, 'jackOfAllTrades');

    const intents = computeIntents(state, selecting([jack!.id]));

    expect(intents.board.get(`space:${at(1)}`)?.[0]).toEqual({ type: 'playForMovement', cardId: jack!.id, pieceId: 0, suit: 'paddle' });
  });

  it('widens the reach when several movement cards are selected, in one click', () => {
    const state = game('G1 G1 G1 G1 G1');
    const [first, second] = setHand(state, 0, 'scout', 'scout');

    const one = computeIntents(state, selecting([first!.id]));
    const both = computeIntents(state, selecting([first!.id, second!.id]));
    const after = run(state, ...both.board.get(`space:${at(4)}`)!).state;

    expect(one.board.has(`space:${at(4)}`)).toBe(false);
    expect(after.pieces[0]!.at).toBe(at(4));
    expect(after.players[0]!.hand).toEqual([]);
  });

  it('lets you switch to your other piece after moving one', () => {
    const state = game('G1 G1 . G1 G1');
    const ownSecond = addPiece(state, 0, at(3));
    const [scout, explorer] = setHand(state, 0, 'scout', 'explorer');
    const moved = run(state, ...computeIntents(state, selecting([scout!.id])).board.get(`space:${at(1)}`)!).state;

    const other = computeIntents(moved, selecting([explorer!.id], { pieceId: ownSecond }));

    expect(other.board.has(`space:${at(4)}`)).toBe(true);
  });

  it('offers rubble and base camps when the right number of cards is selected', () => {
    const state = game('G1 R2');
    const [a, b] = setHand(state, 0, 'traveler', 'sailor', 'explorer');

    expect(computeIntents(state, selecting([a!.id])).board.has(`space:${at(1)}`)).toBe(false);
    expect(computeIntents(state, selecting([a!.id, b!.id])).board.get(`space:${at(1)}`)).toEqual([
      { type: 'payCards', pieceId: 0, target: { kind: 'space', hex: at(1) }, cardIds: [a!.id, b!.id] },
    ]);
  });

  it('marks only the market cards the selected coins can pay for', () => {
    const state = game('G1');
    const [traveler] = setHand(state, 0, 'traveler');

    const market = computeIntents(state, selecting([traveler!.id])).market;

    expect([...market.keys()]).toEqual(['scout']);
  });

  it('lets a selected Telegraph take any card, reserve included', () => {
    const state = game('G1');
    const [transmitter] = setHand(state, 0, 'transmitter');

    const market = computeIntents(state, selecting([transmitter!.id])).market;

    expect(market.size).toBe(18);
    expect(market.get('pioneer')).toEqual({ type: 'playTransmitter', cardId: transmitter!.id, take: 'pioneer' });
  });

  it('only offers the removal while a Scientist choice is pending', () => {
    const state = game('G1 G1');
    const [scientist, explorer] = setHand(state, 0, 'scientist', 'explorer');
    setDrawPile(state, 0, 'traveler');
    const pending = run(state, { type: 'playAction', cardId: scientist!.id }).state;

    const intents = computeIntents(pending, selecting([explorer!.id]));

    expect(intents.removal).toEqual({ type: 'removeFromHand', cardIds: [explorer!.id] });
    expect(intents.board.size + intents.market.size).toBe(0);
    expect(intents.endTurn).toBeNull();
  });
});

describe('cardsRemovedBy', () => {
  it('names a single-use coin card the purchase spends at full value', () => {
    const state = game('G1');
    const [chest] = setHand(state, 0, 'treasureChest');

    expect(cardsRemovedBy(state, { type: 'buy', cardType: 'trailblazer', cardIds: [chest!.id] })).toEqual([chest]);
  });

  it('names nothing when the single-use card only counts as half a coin', () => {
    const state = game('G1');
    const [photographer, chest] = setHand(state, 0, 'photographer', 'treasureChest');

    expect(cardsRemovedBy(state, { type: 'buy', cardType: 'photographer', cardIds: [photographer!.id, chest!.id] })).toEqual([]);
  });

  it('names the Telegraph when it takes a free card', () => {
    const state = game('G1');
    const [telegraph] = setHand(state, 0, 'transmitter');

    expect(cardsRemovedBy(state, { type: 'playTransmitter', cardId: telegraph!.id, take: 'scout' })).toEqual([telegraph]);
  });
});

describe('keptBySelectingMore', () => {
  it('is true when the rest of the hand covers the price without the single-use card', () => {
    const state = game('G1');
    const [chest, trader] = setHand(state, 0, 'treasureChest', 'traveler', 'sailor', 'explorer');

    expect(keptBySelectingMore(state, { type: 'buy', cardType: 'photographer', cardIds: [chest!.id, trader!.id] })).toBe(true);
  });

  it('is false when even the whole hand needs the single-use card at full value', () => {
    const state = game('G1');
    const [chest] = setHand(state, 0, 'treasureChest', 'sailor');

    expect(keptBySelectingMore(state, { type: 'buy', cardType: 'trailblazer', cardIds: [chest!.id] })).toBe(false);
  });

  it('is false for the Telegraph, which always leaves when it takes a card', () => {
    const state = game('G1');
    const [telegraph] = setHand(state, 0, 'transmitter', 'traveler', 'traveler');

    expect(keptBySelectingMore(state, { type: 'playTransmitter', cardId: telegraph!.id, take: 'scout' })).toBe(false);
  });
});
