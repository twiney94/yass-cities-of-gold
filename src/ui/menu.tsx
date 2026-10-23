import { type CSSProperties, useState } from 'react';
import type { BotLevel } from '../bot/bot';
import { type Difficulty, mapCode } from '../gen/code';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo } from './Logo';
import { PAWN_BAND, PAWN_PATH, PAWN_VIEWBOX } from './art/pawn';
import { type Option, Segmented } from './Segmented';
import { cx } from './cx';
import { type Messages, useMessages } from './i18n';
import { PLAYER_COLORS, type PlayerColor } from './labels';
import { type GameMap, generateInWorker, parseMapCode, randomSeed, standinMap } from './maps';
import type { Seat } from './store';

export type Mode = 'solo' | 'passAndPlay';
type MapChoice = 'standin' | Difficulty;

const COLORS = Object.keys(PLAYER_COLORS) as PlayerColor[];
const COUNTS: Option<number>[] = [2, 3, 4].map((count) => ({ value: count, label: String(count) }));
const LEVELS: BotLevel[] = ['easy', 'normal', 'strong'];
const MAPS: { value: MapChoice; pips: number }[] = [
  { value: 'standin', pips: 0 },
  { value: 'easy', pips: 1 },
  { value: 'medium', pips: 2 },
  { value: 'hard', pips: 3 },
];

const modeName = (mode: Mode, m: Messages) => (mode === 'solo' ? m.menu.solo : m.menu.passAndPlay);
const mapLabel = (choice: MapChoice, m: Messages) => (choice === 'standin' ? m.maps.standin : m.difficulties[choice]);

const freeColor = (seats: Seat[]) => COLORS.find((color) => seats.every((seat) => seat.color !== color))!;

const newSeat = (mode: Mode, seats: Seat[]): Seat =>
  mode === 'solo' ? { kind: 'bot', level: 'normal', color: freeColor(seats) } : { kind: 'human', color: freeColor(seats) };

const openingSeats = (mode: Mode): Seat[] => {
  const you: Seat = { kind: 'human', color: freeColor([]) };
  return [you, newSeat(mode, [you])];
};

function Meeple() {
  return (
    <svg className="meeple" viewBox={PAWN_VIEWBOX} aria-hidden="true">
      <path d={PAWN_PATH} />
      <path className="meeple__band" d={PAWN_BAND} />
    </svg>
  );
}

export function TitleScreen({ onMode }: { onMode: (mode: Mode) => void }) {
  const m = useMessages();
  return (
    <div className="menu">
      <LanguageSwitch className="menu__language" />
      <div className="menu__title">
        <h1>
          <Logo />
        </h1>
        <p className="menu__tagline muted">{m.menu.tagline}</p>
        <nav className="modes" aria-label={m.menu.modes}>
          <button type="button" className="mode" onClick={() => onMode('solo')}>
            <span className="mode__icon">
              <Meeple />
            </span>
            <span className="mode__text">
              <strong>{m.menu.solo}</strong>
              <span className="muted">{m.menu.soloBlurb}</span>
            </span>
          </button>
          <button type="button" className="mode" onClick={() => onMode('passAndPlay')}>
            <span className="mode__icon mode__icon--pair">
              <Meeple />
              <Meeple />
            </span>
            <span className="mode__text">
              <strong>{m.menu.passAndPlay}</strong>
              <span className="muted">{m.menu.passAndPlayBlurb}</span>
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
}

type SetupProps = { mode: Mode; onBack: () => void; onStart: (seats: Seat[], map: GameMap) => void };

export function SetupScreen({ mode, onBack, onStart }: SetupProps) {
  const m = useMessages();
  const [seats, setSeats] = useState(() => openingSeats(mode));
  const [palette, setPalette] = useState<number | null>(null);
  const [choice, setChoice] = useState<MapChoice>('medium');
  const [code, setCode] = useState(() => mapCode('medium', randomSeed()));
  const [generating, setGenerating] = useState(false);
  const [problem, setProblem] = useState(false);

  const kinds: Option<Seat['kind']>[] = [
    { value: 'human', label: m.menu.human },
    { value: 'bot', label: m.menu.bot },
  ];
  const levels: Option<BotLevel>[] = LEVELS.map((level) => ({ value: level, label: m.levels[level] }));

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
    setProblem(false);
    try {
      onStart(seats, await generateInWorker(parsed.difficulty, parsed.seed));
    } catch {
      setProblem(true);
      setGenerating(false);
    }
  };

  return (
    <div className="menu menu--setup">
      <header className="menu__bar">
        <button type="button" className="btn btn--ghost menu__back" onClick={onBack}>
          {m.menu.back}
        </button>
        <h1>{modeName(mode, m)}</h1>
      </header>

      <div className="menu__body">
        <section className="panel" aria-labelledby="map-heading">
          <h2 id="map-heading">{m.menu.map}</h2>
          <div className="maps" role="radiogroup" aria-label={m.menu.map}>
            {MAPS.map(({ value, pips }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={choice === value}
                className={cx('map-choice', choice === value && 'is-on')}
                onClick={() => pick(value)}
              >
                <span>{mapLabel(value, m)}</span>
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
              <label htmlFor="map-code">{m.menu.mapCode}</label>
              <input id="map-code" value={code} onChange={(event) => editCode(event.target.value)} spellCheck={false} aria-invalid={!parsed} />
              <button type="button" className="btn" onClick={() => pick(choice)}>
                {m.menu.newMap}
              </button>
            </div>
          )}
          {choice !== 'standin' && !parsed && <p className="menu__problem">{m.menu.badCode}</p>}
        </section>

        <section className="panel" aria-labelledby="players-heading">
          <div className="panel__head">
            <h2 id="players-heading">{m.menu.players}</h2>
            <Segmented label={m.menu.playerCount} options={COUNTS} value={seats.length} onChange={resize} />
          </div>
          <ul className="seats">
            {seats.map((seat, i) => {
              const name = m.colors[seat.color];
              const fixed = mode === 'solo';
              return (
                <li key={i} className="seat" style={{ '--seat': PLAYER_COLORS[seat.color] } as CSSProperties}>
                  <button
                    type="button"
                    className="seat__color"
                    aria-label={m.menu.changeColor(name)}
                    aria-expanded={palette === i}
                    onClick={() => setPalette(palette === i ? null : i)}
                  >
                    <Meeple />
                  </button>
                  <span className="seat__who">
                    <strong>{name}</strong>
                    {fixed && <span className="muted">{i === 0 ? m.menu.you : m.menu.bot}</span>}
                  </span>
                  <span className="seat__controls">
                    {!fixed && (
                      <Segmented
                        className="seat__kind"
                        label={m.menu.playedBy(name)}
                        options={kinds}
                        value={seat.kind}
                        onChange={(kind) => setSeat(i, kind === 'human' ? { kind, color: seat.color } : { kind, level: 'normal', color: seat.color })}
                      />
                    )}
                    {seat.kind === 'bot' && (
                      <Segmented
                        className="seat__level"
                        label={m.menu.botStrength(name)}
                        options={levels}
                        value={seat.level}
                        onChange={(level) => setSeat(i, { ...seat, level })}
                      />
                    )}
                  </span>
                  {palette === i && (
                    <span className="palette" role="radiogroup" aria-label={m.menu.colorOf(name)}>
                      {COLORS.map((color) => {
                        const taken = seats.some((other, j) => j !== i && other.color === color);
                        return (
                          <button
                            key={color}
                            type="button"
                            role="radio"
                            aria-checked={seat.color === color}
                            aria-label={taken ? m.menu.taken(m.colors[color]) : m.colors[color]}
                            disabled={taken}
                            className="swatch"
                            style={{ background: PLAYER_COLORS[color] }}
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
        {problem && <p className="menu__problem">{m.menu.generateFailed}</p>}
        {mode === 'passAndPlay' && <p className="muted menu__note">{m.menu.passNote}</p>}
        <button type="button" className="btn btn--primary btn--big menu__start" disabled={generating || (choice !== 'standin' && !parsed)} onClick={start}>
          {m.menu.start}
        </button>
      </footer>

      {generating && (
        <div className="overlay" role="status">
          <div className="overlay__panel">
            <span className="spinner" aria-hidden />
            <h2>{m.menu.charting}</h2>
            <p className="muted">{m.menu.chartingDetail}</p>
          </div>
        </div>
      )}
    </div>
  );
}
