import { useState } from 'react';
import { STANDIN_ROUTE } from './content/standin';
import { GameScreen } from './ui/GameScreen';
import { cx } from './ui/cx';
import { PLAYERS } from './ui/labels';
import { type Seat, useGame } from './ui/store';

const SEAT_KINDS: Seat[] = ['human', 'bot'];

export default function App() {
  const playing = useGame((s) => s.game !== null);
  const newGame = useGame((s) => s.newGame);
  const [seats, setSeats] = useState<Seat[]>(['human', 'bot']);

  if (playing) return <GameScreen />;

  const resize = (count: number) =>
    setSeats((current) => Array.from({ length: count }, (_, i) => current[i] ?? 'bot'));
  const setSeat = (index: number, seat: Seat) => setSeats((current) => current.map((s, i) => (i === index ? seat : s)));

  return (
    <div className="setup">
      <h1>El Dorado</h1>
      <p className="muted">Race through the jungle. Route: {STANDIN_ROUTE.name}</p>
      <div className="setup__choices" role="group" aria-label="Number of players">
        {[2, 3, 4].map((count) => (
          <button
            key={count}
            type="button"
            className={cx('btn', seats.length === count && 'btn--primary')}
            aria-pressed={seats.length === count}
            onClick={() => resize(count)}
          >
            {count} players
          </button>
        ))}
      </div>
      <ul className="seats">
        {seats.map((seat, i) => (
          <li key={PLAYERS[i]!.name} className="seat">
            <span className="dot" style={{ background: PLAYERS[i]!.color }} />
            <strong>{PLAYERS[i]!.name}</strong>
            <span className="seat__kinds" role="group" aria-label={`${PLAYERS[i]!.name} is played by`}>
              {SEAT_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={cx('btn', 'btn--small', seat === kind && 'btn--primary')}
                  aria-pressed={seat === kind}
                  onClick={() => setSeat(i, kind)}
                >
                  {kind === 'human' ? 'Human' : 'Bot'}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn--primary btn--big" onClick={() => newGame(seats)}>
        Start
      </button>
      <p className="muted setup__note">Humans share this device and pass it between turns; bots play on their own.</p>
    </div>
  );
}
