import { type CSSProperties, useState } from 'react';
import type { BotLevel } from '../bot/bot';
import { STANDIN_ROUTE } from '../content/standin';
import { type Difficulty, mapCode } from '../gen/code';
import { Logo } from './Logo';
import { cx } from './cx';
import { BOT_LEVEL_LABEL, PLAYER_COLORS, type PlayerColor } from './labels';
import { type GameMap, generateInWorker, parseMapCode, randomSeed, standinMap } from './maps';
import type { Seat } from './store';

export type Mode = 'solo' | 'passAndPlay';
type MapChoice = 'standin' | Difficulty;
type Option<T> = { value: T; label: string };

const MODE_NAME: Record<Mode, string> = { solo: 'Solo', passAndPlay: 'Pass & play' };
const COLORS = Object.keys(PLAYER_COLORS) as PlayerColor[];
const COUNTS: Option<number>[] = [2, 3, 4].map((count) => ({ value: count, label: String(count) }));
const KINDS: Option<Seat['kind']>[] = [
  { value: 'human', label: 'Human' },
  { value: 'bot', label: 'Bot' },
];
const LEVELS: Option<BotLevel>[] = (['easy', 'normal', 'strong'] as const).map((level) => ({ value: level, label: BOT_LEVEL_LABEL[level] }));
const MAPS: (Option<MapChoice> & { pips: number })[] = [
  { value: 'standin', label: STANDIN_ROUTE.name, pips: 0 },
  { value: 'easy', label: 'Easy', pips: 1 },
  { value: 'medium', label: 'Medium', pips: 2 },
  { value: 'hard', label: 'Hard', pips: 3 },
];

const freeColor = (seats: Seat[]) => COLORS.find((color) => seats.every((seat) => seat.color !== color))!;

const newSeat = (mode: Mode, seats: Seat[]): Seat =>
  mode === 'solo' ? { kind: 'bot', level: 'normal', color: freeColor(seats) } : { kind: 'human', color: freeColor(seats) };

const openingSeats = (mode: Mode): Seat[] => {
  const you: Seat = { kind: 'human', color: freeColor([]) };
  return [you, newSeat(mode, [you])];
};

function Meeple() {
  return (
    <svg className="meeple" viewBox="-16 -37 32 39" aria-hidden="true">
      <path d="M-11 0H-3.5L0-8L3.5 0H11L7-13Q15-15 14-20Q12-24 5-22H-5Q-12-24-14-20Q-15-15-7-13Z" />
      <circle cx="0" cy="-28.5" r="6.5" />
    </svg>
  );
}

type SegmentedProps<T> = { label: string; options: Option<T>[]; value: T; onChange: (value: T) => void; className?: string };

function Segmented<T extends string | number>(props: SegmentedProps<T>) {
  return (
    <div className={cx('segmented', props.className)} role="radiogroup" aria-label={props.label}>
      {props.options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={props.value === option.value}
          className={cx('segmented__option', props.value === option.value && 'is-on')}
          onClick={() => props.onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function TitleScreen({ onMode }: { onMode: (mode: Mode) => void }) {
  return (
    <div className="menu">
      <div className="menu__title">
        <h1>
          <Logo />
        </h1>
        <p className="menu__tagline muted">Race through the jungle to the lost City of Gold.</p>
        <nav className="modes" aria-label="Game mode">
          <button type="button" className="mode" onClick={() => onMode('solo')}>
            <span className="mode__icon">
              <Meeple />
            </span>
            <span className="mode__text">
              <strong>{MODE_NAME.solo}</strong>
              <span className="muted">Race against 1 to 3 bots</span>
            </span>
          </button>
          <button type="button" className="mode" onClick={() => onMode('passAndPlay')}>
            <span className="mode__icon mode__icon--pair">
              <Meeple />
              <Meeple />
            </span>
            <span className="mode__text">
              <strong>{MODE_NAME.passAndPlay}</strong>
              <span className="muted">2 to 4 players on one device</span>
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
}

type SetupProps = { mode: Mode; onBack: () => void; onStart: (seats: Seat[], map: GameMap) => void };

export function SetupScreen({ mode, onBack, onStart }: SetupProps) {
  const [seats, setSeats] = useState(() => openingSeats(mode));
  const [palette, setPalette] = useState<number | null>(null);
  const [choice, setChoice] = useState<MapChoice>('medium');
  const [code, setCode] = useState(() => mapCode('medium', randomSeed()));
  const [generating, setGenerating] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const resize = (count: number) =>
    setSeats((current) => {
      const next = current.slice(0, count);
      while (next.length < count) next.push(newSeat(mode, next));
      return next;
    });
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
    if (choice === 'standin') return onStart(seats, standinMap());
    if (!parsed) return;
    setGenerating(true);
    setProblem(null);
    try {
      onStart(seats, await generateInWorker(parsed.difficulty, parsed.seed));
    } catch {
      setProblem('The map could not be generated. Try another code.');
      setGenerating(false);
    }
  };

  return (
    <div className="menu menu--setup">
      <header className="menu__bar">
        <button type="button" className="btn btn--ghost menu__back" onClick={onBack}>
          ‹ Menu
        </button>
        <h1>{MODE_NAME[mode]}</h1>
      </header>

      <div className="menu__body">
        <section className="panel" aria-labelledby="map-heading">
          <h2 id="map-heading">Map</h2>
          <div className="maps" role="radiogroup" aria-label="Map">
            {MAPS.map(({ value, label, pips }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={choice === value}
                className={cx('map-choice', choice === value && 'is-on')}
                onClick={() => pick(value)}
              >
                <span>{label}</span>
                {pips > 0 && (
                  <span className="pips" aria-hidden>
                    {[1, 2, 3].map((pip) => (
                      <i key={pip} className={cx(pip <= pips && 'is-on')} />
                    ))}
                  </span>
                )}
              </button>
            ))}
          </div>
          {choice !== 'standin' && (
            <div className="map-code">
              <label htmlFor="map-code">Map code</label>
              <input id="map-code" value={code} onChange={(event) => editCode(event.target.value)} spellCheck={false} aria-invalid={!parsed} />
              <button type="button" className="btn" onClick={() => pick(choice)}>
                New map
              </button>
            </div>
          )}
          {choice !== 'standin' && !parsed && <p className="menu__problem">Codes look like M-1A2B: a letter for the difficulty, then the map number.</p>}
        </section>

        <section className="panel" aria-labelledby="players-heading">
          <div className="panel__head">
            <h2 id="players-heading">Players</h2>
            <Segmented label="Number of players" options={COUNTS} value={seats.length} onChange={resize} />
          </div>
          <ul className="seats">
            {seats.map((seat, i) => {
              const look = PLAYER_COLORS[seat.color];
              const fixed = mode === 'solo';
              return (
                <li key={i} className="seat" style={{ '--seat': look.hex } as CSSProperties}>
                  <button
                    type="button"
                    className="seat__color"
                    aria-label={`Change ${look.name}'s colour`}
                    aria-expanded={palette === i}
                    onClick={() => setPalette(palette === i ? null : i)}
                  >
                    <Meeple />
                  </button>
                  <span className="seat__who">
                    <strong>{look.name}</strong>
                    {fixed && <span className="muted">{i === 0 ? 'You' : 'Bot'}</span>}
                  </span>
                  <span className="seat__controls">
                    {!fixed && (
                      <Segmented
                        className="seat__kind"
                        label={`${look.name} is played by`}
                        options={KINDS}
                        value={seat.kind}
                        onChange={(kind) => setSeat(i, kind === 'human' ? { kind, color: seat.color } : { kind, level: 'normal', color: seat.color })}
                      />
                    )}
                    {seat.kind === 'bot' && (
                      <Segmented
                        className="seat__level"
                        label={`${look.name} bot strength`}
                        options={LEVELS}
                        value={seat.level}
                        onChange={(level) => setSeat(i, { ...seat, level })}
                      />
                    )}
                  </span>
                  {palette === i && (
                    <span className="palette" role="radiogroup" aria-label={`${look.name}'s colour`}>
                      {COLORS.map((color) => {
                        const taken = seats.some((other, j) => j !== i && other.color === color);
                        return (
                          <button
                            key={color}
                            type="button"
                            role="radio"
                            aria-checked={seat.color === color}
                            aria-label={taken ? `${PLAYER_COLORS[color].name} (taken)` : PLAYER_COLORS[color].name}
                            disabled={taken}
                            className="swatch"
                            style={{ background: PLAYER_COLORS[color].hex }}
                            onClick={() => {
                              setSeat(i, { ...seat, color });
                              setPalette(null);
                            }}
                          />
                        );
                      })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <footer className="menu__footer">
        {problem && <p className="menu__problem">{problem}</p>}
        {mode === 'passAndPlay' && <p className="muted menu__note">Pass the device between turns; your hand stays hidden until you tap.</p>}
        <button type="button" className="btn btn--primary btn--big menu__start" disabled={generating || (choice !== 'standin' && !parsed)} onClick={start}>
          Start
        </button>
      </footer>

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
