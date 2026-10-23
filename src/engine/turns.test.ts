import { describe, expect, it } from 'vitest';
import type { Action } from './actions';
import { rankFinishers } from './rules';
import { at, trackBoard } from './testing/boards';
import { addPiece, newGame, placePiece, run, setDiscard, setDrawPile, setHand, types } from './testing/fixtures';

const endTurn: Action = { type: 'endTurn', discard: [] };

describe('end of turn', () => {
  it('discards played cards, keeps the hand cards you choose, and refills to 4', () => {
    const state = newGame(trackBoard('G1 G1'));
    const [explorer, , traveler] = setHand(state, 0, 'explorer', 'scout', 'traveler', 'sailor');
    setDrawPile(state, 0, 'captain', 'pioneer', 'native');

    const { state: after, events } = run(
      state,
      { type: 'playForMovement', cardId: explorer!.id, pieceId: 0 },
      { type: 'endTurn', discard: [traveler!.id] },
    );

    const player = after.players[0]!;
    expect(types(player.hand)).toEqual(['scout', 'sailor', 'captain', 'pioneer']);
    expect(types(player.discard)).toEqual(['explorer', 'traveler']);
    expect(player.played).toEqual([]);
    expect(after.turn).toEqual({ player: 1, stage: 'moving', movement: null, pending: null });
    expect(events).toContainEqual({ type: 'turnStarted', player: 1 });
  });

  it('draws what is left, then shuffles the discard pile (including this turn’s cards) to draw the rest', () => {
    const state = newGame(trackBoard('G1 G1'));
    const [explorer] = setHand(state, 0, 'explorer');
    setDrawPile(state, 0, 'scout');
    setDiscard(state, 0, 'captain', 'pioneer');

    const { state: after, events } = run(state, { type: 'playForMovement', cardId: explorer!.id, pieceId: 0 }, endTurn);

    expect(types(after.players[0]!.hand).sort()).toEqual(['captain', 'explorer', 'pioneer', 'scout']);
    expect(events.map((e) => e.type)).toEqual(['cardPlayed', 'cardsDrawn', 'deckShuffled', 'cardsDrawn', 'turnStarted']);
  });
});

describe('end of game', () => {
  it('finishes the round after a player reaches the City of Gold, then names the winner', () => {
    const state = newGame(trackBoard('G1 FG1'), 4);
    placePiece(state, 1, at(0));
    const [explorer] = setHand(state, 1, 'explorer');

    const reached = run(
      state,
      endTurn,
      { type: 'playForMovement', cardId: explorer!.id, pieceId: 1 },
      { type: 'step', target: { kind: 'space', hex: at(1) } },
    );
    expect(reached.state.pieces[1]!.at).toBe('eldorado');
    expect(reached.state.status).toEqual({ kind: 'finalRound' });
    expect(reached.events).toContainEqual({ type: 'finalRoundStarted', player: 1 });

    const twoTurnsLater = run(reached.state, endTurn, endTurn);
    expect(twoTurnsLater.state.status).toEqual({ kind: 'finalRound' });
    expect(twoTurnsLater.state.turn.player).toBe(3);

    const over = run(twoTurnsLater.state, endTurn);
    expect(over.state.status).toEqual({ kind: 'over', winner: 1 });
    expect(over.events).toContainEqual({ type: 'gameOver', winner: 1 });
  });

  it('ends at once when the last player of the round arrives first', () => {
    const state = newGame(trackBoard('G1 FG1'), 3);
    placePiece(state, 2, at(0));
    const [explorer] = setHand(state, 2, 'explorer');

    const after = run(
      state,
      endTurn,
      endTurn,
      { type: 'playForMovement', cardId: explorer!.id, pieceId: 2 },
      { type: 'step', target: { kind: 'space', hex: at(1) } },
      endTurn,
    ).state;

    expect(after.status).toEqual({ kind: 'over', winner: 2 });
  });

  it('frees the finishing space for the next piece', () => {
    const state = newGame(trackBoard('G1 FG1 G1'), 3);
    placePiece(state, 0, at(0));
    placePiece(state, 1, at(2));
    const [first] = setHand(state, 0, 'explorer');
    const [second] = setHand(state, 1, 'explorer');

    const after = run(
      state,
      { type: 'playForMovement', cardId: first!.id, pieceId: 0 },
      { type: 'step', target: { kind: 'space', hex: at(1) } },
      endTurn,
      { type: 'playForMovement', cardId: second!.id, pieceId: 1 },
      { type: 'step', target: { kind: 'space', hex: at(1) } },
    ).state;

    expect(after.pieces.slice(0, 2).map((p) => p.at)).toEqual(['eldorado', 'eldorado']);
  });

  it('needs every piece of a player in the City of Gold before the final round starts', () => {
    const state = newGame(trackBoard('G1 FG1 . G1 FG1'));
    placePiece(state, 0, at(0));
    const ownSecond = addPiece(state, 0, at(3));
    const [first, second] = setHand(state, 0, 'explorer', 'explorer');

    const one = run(
      state,
      { type: 'playForMovement', cardId: first!.id, pieceId: 0 },
      { type: 'step', target: { kind: 'space', hex: at(1) } },
    ).state;
    expect(one.status).toEqual({ kind: 'playing' });

    const both = run(
      one,
      { type: 'playForMovement', cardId: second!.id, pieceId: ownSecond },
      { type: 'step', target: { kind: 'space', hex: at(4) } },
      endTurn,
      endTurn,
    ).state;
    expect(both.status).toEqual({ kind: 'over', winner: 0 });
  });

  describe('tie-breaks between players who reached the City of Gold', () => {
    const finishers = (a: { blockades: number[]; order: number }, b: { blockades: number[]; order: number }) => {
      const state = newGame(trackBoard('G1'));
      [a, b].forEach(({ blockades, order }, i) => {
        state.players[i]!.blockades = blockades;
        state.players[i]!.finishedOrder = order;
      });
      return rankFinishers(state);
    };

    it('favour the most blockades', () => {
      expect(finishers({ blockades: [1], order: 0 }, { blockades: [2, 3], order: 1 })).toEqual([1, 0]);
    });

    it('then the highest blockade number', () => {
      expect(finishers({ blockades: [5], order: 1 }, { blockades: [2], order: 0 })).toEqual([0, 1]);
    });

    it('then whoever arrived first', () => {
      expect(finishers({ blockades: [], order: 1 }, { blockades: [], order: 0 })).toEqual([1, 0]);
    });
  });
});
