import { useEffect, useState } from 'react';
import { cx } from './cx';
import { useMessages } from './i18n';
import { PLAYER_COLORS } from './labels';
import type { PendingRoll } from './store';

const ROLL_TIME = 900;
const SETTLE_TIME = 700;
const TUMBLE_TIME = 90;

const PIPS: Record<number, [number, number][]> = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [3, 1], [1, 3], [3, 3]],
  5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]],
  6: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]],
};

function Die({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <svg className={cx('die', rolling && 'is-rolling')} viewBox="0 0 40 40" aria-hidden="true">
      <rect x="2" y="2" width="36" height="36" rx="8" />
      {PIPS[value]!.map(([col, row]) => (
        <circle key={`${col}-${row}`} cx={col * 9 + 2} cy={row * 9 + 2} r="3.6" />
      ))}
    </svg>
  );
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function DiceRoll({ roll, onDone }: { roll: PendingRoll; onDone: () => void }) {
  const m = useMessages();
  const { seats, result } = roll;
  const rounds = Math.max(...result.rolls.map((dice) => dice.length));
  const [step, setStep] = useState({ round: 0, rolling: !reducedMotion() });
  const [tumble, setTumble] = useState(0);
  const done = step.round === rounds - 1 && !step.rolling;

  useEffect(() => {
    if (step.rolling) {
      const spin = window.setInterval(() => setTumble((t) => t + 1), TUMBLE_TIME);
      const land = window.setTimeout(() => setStep((s) => ({ ...s, rolling: false })), ROLL_TIME);
      return () => {
        window.clearInterval(spin);
        window.clearTimeout(land);
      };
    }
    if (step.round === rounds - 1) return;
    const next = window.setTimeout(() => setStep({ round: step.round + 1, rolling: !reducedMotion() }), SETTLE_TIME);
    return () => window.clearTimeout(next);
  }, [step, rounds]);

  const rank = (player: number) => result.order.indexOf(player) + 1;
  const first = m.colors[seats[result.order[0]!]!.color];

  return (
    <div className="overlay">
      <div className="overlay__panel dice" role="dialog" aria-modal="true" aria-labelledby="dice-title">
        <h2 id="dice-title">{m.dice.title}</h2>
        <ol className="dice__rows">
          {seats.map((seat, player) => {
            const dice = result.rolls[player]!.slice(0, step.round + 1);
            return (
              <li key={seat.color} className={cx('dice__row', done && rank(player) === 1 && 'is-first')}>
                <span className="dot" style={{ background: PLAYER_COLORS[seat.color] }} />
                <strong>{m.colors[seat.color]}</strong>
                <span className="dice__faces">
                  {dice.map((value, round) => {
                    const rolling = step.rolling && round === step.round;
                    return <Die key={round} value={rolling ? ((value + tumble + player) % 6) + 1 : value} rolling={rolling} />;
                  })}
                </span>
                <span className="dice__rank">{done ? m.dice.rank(rank(player)) : ''}</span>
              </li>
            );
          })}
        </ol>
        <p className="dice__note" aria-live="polite">
          {done ? m.dice.first(first) : step.round > 0 ? m.dice.tie : ' '}
        </p>
        <button type="button" className="btn btn--primary btn--big" disabled={!done} onClick={onDone}>
          {m.dice.go}
        </button>
      </div>
    </div>
  );
}
