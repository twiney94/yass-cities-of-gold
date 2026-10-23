import { Suspense, lazy, useEffect, useState } from 'react';
import { STANDIN_ROUTE } from './content/standin';
import { type Difficulty, mapCode } from './gen/code';
import { Logo } from './ui/Logo';
import { cx } from './ui/cx';
import type { BotLevel } from './bot/bot';
import { BOT_LEVEL_LABEL, PLAYERS } from './ui/labels';
import { generateInWorker, parseMapCode, randomSeed, standinMap } from './ui/maps';
import { type Seat, useGame } from './ui/store';

const loadGameScreen = () => import('./ui/GameScreen');
const GameScreen = lazy(() => loadGameScreen().then((module) => ({ default: module.GameScreen })));

const BOT_LEVELS: BotLevel[] = ['easy', 'normal', 'strong'];
const HUMAN: Seat = { kind: 'human' };
const BOT: Seat = { kind: 'bot', level: 'normal' };
const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

type MapChoice = 'standin' | Difficulty;

export default function App() {
  const playing = useGame((s) => s.game !== null);
  const newGame = useGame((s) => s.newGame);
  const [seats, setSeats] = useState<Seat[]>([HUMAN, BOT]);
  const [choice, setChoice] = useState<MapChoice>('medium');
  const [code, setCode] = useState(() => mapCode('medium', randomSeed()));
  const [generating, setGenerating] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    void loadGameScreen();
  }, []);

  if (playing) {
    return (
      <Suspense fallback={<div className="setup" />}>
        <GameScreen />
      </Suspense>
    );
  }

  const resize = (count: number) => setSeats((current) => Array.from({ length: count }, (_, i) => current[i] ?? BOT));
  const setSeat = (index: number, seat: Seat) => setSeats((current) => current.map((s, i) => (i === index ? seat : s)));
  const pick = (next: MapChoice) => {
    setChoice(next);
    if (next !== 'standin') setCode(mapCode(next, randomSeed()));
  };
  const editCode = (value: string) => {
    setCode(value);
    const parsed = parseMapCode(value);
    if (parsed) setChoice(parsed.difficulty);
  };
  const parsed = choice === 'standin' ? null : parseMapCode(code);

  const start = async () => {
    if (choice === 'standin') return newGame(seats, standinMap());
    if (!parsed) return;
    setGenerating(true);
    setProblem(null);
    try {
      newGame(seats, await generateInWorker(parsed.difficulty, parsed.seed));
    } catch {
      setProblem('The map could not be generated. Try another code.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="setup">
      <h1>
        <Logo />
      </h1>
      <p className="muted">Race through the jungle to the lost City of Gold.</p>

      <section className="setup__section" aria-label="Map">
        <h2>Map</h2>
        <div className="setup__choices">
          <button type="button" className={cx('btn', choice === 'standin' && 'btn--primary')} aria-pressed={choice === 'standin'} onClick={() => pick('standin')}>
            {STANDIN_ROUTE.name}
          </button>
          {DIFFICULTIES.map(({ value, label }) => (
            <button key={value} type="button" className={cx('btn', choice === value && 'btn--primary')} aria-pressed={choice === value} onClick={() => pick(value)}>
              {label}
            </button>
          ))}
        </div>
        {choice !== 'standin' && (
          <div className="setup__code">
            <label htmlFor="map-code">Map code</label>
            <input id="map-code" value={code} onChange={(event) => editCode(event.target.value)} spellCheck={false} aria-invalid={!parsed} />
            <button type="button" className="btn btn--small" onClick={() => pick(choice)}>
              New map
            </button>
          </div>
        )}
        {choice !== 'standin' && !parsed && <p className="setup__problem">Codes look like M-1A2B: a letter for the difficulty, then the map number.</p>}
      </section>

      <section className="setup__section" aria-label="Players">
        <h2>Players</h2>
        <div className="setup__choices" role="group" aria-label="Number of players">
          {[2, 3, 4].map((count) => (
            <button key={count} type="button" className={cx('btn', seats.length === count && 'btn--primary')} aria-pressed={seats.length === count} onClick={() => resize(count)}>
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
                {[HUMAN, BOT].map((kind) => (
                  <button
                    key={kind.kind}
                    type="button"
                    className={cx('btn', 'btn--small', seat.kind === kind.kind && 'btn--primary')}
                    aria-pressed={seat.kind === kind.kind}
                    onClick={() => seat.kind !== kind.kind && setSeat(i, kind)}
                  >
                    {kind.kind === 'human' ? 'Human' : 'Bot'}
                  </button>
                ))}
                {seat.kind === 'bot' && (
                  <select
                    className="seat__level"
                    aria-label={`${PLAYERS[i]!.name} bot strength`}
                    value={seat.level}
                    onChange={(event) => setSeat(i, { kind: 'bot', level: event.target.value as BotLevel })}
                  >
                    {BOT_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {BOT_LEVEL_LABEL[level]}
                      </option>
                    ))}
                  </select>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <button type="button" className="btn btn--primary btn--big" disabled={generating || (choice !== 'standin' && !parsed)} onClick={start}>
        Start
      </button>
      {problem && <p className="setup__problem">{problem}</p>}
      <p className="muted setup__note">Humans share this device and pass it between turns; bots play on their own.</p>

      {generating && (
        <div className="overlay" role="status">
          <div className="overlay__panel">
            <span className="spinner" aria-hidden />
            <h2>Charting the trail…</h2>
            <p className="muted">Generating the map and letting bots playtest it.</p>
          </div>
        </div>
      )}
    </div>
  );
}
