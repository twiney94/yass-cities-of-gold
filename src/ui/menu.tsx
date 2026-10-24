import { type CSSProperties, useRef, useState } from 'react';
import type { BotLevel } from '../bot/bot';
import { type Difficulty, mapCode } from '../gen/code';
import { BurnVeil } from './BurnVeil';
import { CursorTrail } from './CursorTrail';
import { LanguageSwitch } from './LanguageSwitch';
import { SoundSwitch } from './SoundSwitch';
import { Logo } from './Logo';
import adventurer from './art/figures/adventurer.webp';
import captain from './art/figures/captain.webp';
import explorer from './art/figures/explorer.webp';
import journalist from './art/figures/journalist.webp';
import photographer from './art/figures/photographer.webp';
import pioneer from './art/figures/pioneer.webp';
import scientist from './art/figures/scientist.webp';
import trailblazer from './art/figures/trailblazer.webp';
import { PAWN_BAND, PAWN_PATH, PAWN_VIEWBOX } from './art/pawn';
import { CheckIcon, CopyIcon, CrownIcon, PlayIcon, RefreshIcon } from './art/setupIcons';
import { type Option, Segmented } from './Segmented';
import { cx } from './cx';
import { type Messages, useMessages } from './i18n';
import { AboutDialog, RulesDialog } from './info';
import { useIntro } from './intro';
import { PLAYER_COLORS, type PlayerColor } from './labels';
import { type GameMap, generateInWorker, mapTitle, parseMapCode, randomSeed, standinMap } from './maps';
import type { SavedGame } from './save';
import type { Seat } from './store';

export type Mode = 'solo' | 'passAndPlay';
type MapChoice = 'standin' | Difficulty;

const COLORS = Object.keys(PLAYER_COLORS) as PlayerColor[];
const PORTRAITS: Record<PlayerColor, string> = {
  red: pioneer,
  blue: photographer,
  white: journalist,
  yellow: explorer,
  purple: scientist,
  orange: trailblazer,
  pink: adventurer,
  black: captain,
};
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

type Setup = { seats: Seat[]; choice: MapChoice };
const setupKey = (mode: Mode) => `yass-cities-of-gold.setup.${mode}`;

const validSeat = (seat: Seat, index: number, mode: Mode) =>
  seat.color in PLAYER_COLORS &&
  (mode === 'passAndPlay' ? seat.kind === 'human' || seat.kind === 'bot' : seat.kind === (index === 0 ? 'human' : 'bot')) &&
  (seat.kind === 'human' || LEVELS.includes(seat.level));

// The last setup of each mode comes back next time, as long as it still makes sense.
const readSetup = (mode: Mode): Setup | null => {
  try {
    const setup = JSON.parse(localStorage.getItem(setupKey(mode)) ?? 'null') as Setup | null;
    const seats = setup?.seats;
    if (!setup || !Array.isArray(seats) || seats.length < 2 || seats.length > 4) return null;
    if (!seats.every((seat, i) => validSeat(seat, i, mode))) return null;
    if (new Set(seats.map((seat) => seat.color)).size !== seats.length) return null;
    if (!MAPS.some((map) => map.value === setup.choice)) return null;
    return setup;
  } catch {
    return null;
  }
};

const saveSetup = (mode: Mode, setup: Setup) => {
  try {
    localStorage.setItem(setupKey(mode), JSON.stringify(setup));
  } catch (error) {
    console.warn('The setup could not be saved', error);
  }
};

function Meeple() {
  return (
    <svg className="meeple" viewBox={PAWN_VIEWBOX} aria-hidden="true">
      <path d={PAWN_PATH} />
      <path className="meeple__band" d={PAWN_BAND} />
    </svg>
  );
}

type TitleProps = { save: SavedGame | null; onMode: (mode: Mode) => void; onContinue: () => void };

export function TitleScreen({ save, onMode, onContinue }: TitleProps) {
  const m = useMessages();
  const [info, setInfo] = useState<'rules' | 'about' | null>(null);
  const yassRef = useRef<HTMLSpanElement>(null);
  const intro = useIntro(yassRef);
  return (
    <div className={cx('menu', intro.withIntro && 'with-intro', intro.withIntro && `is-${intro.phase}`)} style={intro.style}>
      {intro.withIntro && <BurnVeil phase={intro.phase} />}
      {intro.phase === 'gate' && (
        <button type="button" className="intro-gate" onClick={intro.begin} autoFocus>
          <span>{m.intro.begin}</span>
        </button>
      )}
      {intro.withIntro && intro.phase !== 'gate' && intro.phase !== 'menu' && (
        <button type="button" className="btn btn--ghost btn--small intro-skip" onClick={intro.skip}>
          {m.intro.skip}
        </button>
      )}
      <div className="menu__corner">
        <SoundSwitch />
        <LanguageSwitch />
      </div>
      <div className="menu__title">
        <h1>
          <Logo presents={intro.withIntro ? m.intro.presents : undefined} yassRef={yassRef} />
        </h1>
        <nav className="modes" aria-label={m.menu.modes}>
          {save && (
            <button type="button" className="mode mode--continue wood" onClick={onContinue}>
              <span className="mode__icon">
                <Meeple />
              </span>
              <span className="mode__text">
                <strong>{m.menu.continue}</strong>
                <span className="muted">{m.menu.continueBlurb(mapTitle(save.map, m), save.seats.length)}</span>
              </span>
            </button>
          )}
          <button type="button" className="mode wood" onClick={() => onMode('solo')}>
            <span className="mode__icon">
              <Meeple />
            </span>
            <span className="mode__text">
              <strong>{m.menu.solo}</strong>
            </span>
          </button>
          <button type="button" className="mode wood" onClick={() => onMode('passAndPlay')}>
            <span className="mode__icon mode__icon--pair">
              <Meeple />
              <Meeple />
            </span>
            <span className="mode__text">
              <strong>{m.menu.passAndPlay}</strong>
            </span>
          </button>
        </nav>
        <div className="menu__links">
          <button type="button" className="btn wood" onClick={() => setInfo('rules')}>
            {m.menu.howToPlay}
          </button>
          <button type="button" className="btn wood" onClick={() => setInfo('about')}>
            {m.menu.about}
          </button>
        </div>
      </div>
      {info === 'rules' && <RulesDialog onClose={() => setInfo(null)} />}
      {info === 'about' && <AboutDialog onClose={() => setInfo(null)} />}
      {intro.phase === 'menu' && <CursorTrail />}
    </div>
  );
}

type SetupProps = { mode: Mode; onBack: () => void; onStart: (seats: Seat[], map: GameMap) => void };

export function SetupScreen({ mode, onBack, onStart }: SetupProps) {
  const m = useMessages();
  const [remembered] = useState(() => readSetup(mode));
  const [seats, setSeats] = useState(() => remembered?.seats ?? openingSeats(mode));
  const [palette, setPalette] = useState<number | null>(null);
  const [choice, setChoice] = useState<MapChoice>(remembered?.choice ?? 'medium');
  const [code, setCode] = useState(() => mapCode(choice === 'standin' ? 'medium' : choice, randomSeed()));
  const [generating, setGenerating] = useState(false);
  const [problem, setProblem] = useState(false);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

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

  const copy = () =>
    navigator.clipboard.writeText(code).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => codeRef.current?.select(),
    );

  const start = async () => {
    saveSetup(mode, { seats, choice });
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
        <button type="button" className="btn menu__back" onClick={onBack}>
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
                className={cx('map-choice', `map-choice--${value}`, choice === value && 'is-on')}
                onClick={() => pick(value)}
              >
                <span className="map-choice__art" aria-hidden />
                <span className="map-choice__name">{mapLabel(value, m)}</span>
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
              <span className="map-code__field">
                <input
                  ref={codeRef}
                  id="map-code"
                  value={code}
                  onChange={(event) => editCode(event.target.value)}
                  spellCheck={false}
                  aria-invalid={!parsed}
                />
                <button type="button" className="map-code__copy" aria-label={copied ? m.menu.copied : m.menu.copyCode} title={copied ? m.menu.copied : m.menu.copyCode} onClick={copy}>
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
              </span>
              <button type="button" className="btn map-code__new" onClick={() => pick(choice)}>
                <RefreshIcon />
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
                    className="seat__portrait"
                    aria-label={m.menu.changeColor(name)}
                    aria-expanded={palette === i}
                    onClick={() => setPalette(palette === i ? null : i)}
                  >
                    <img src={PORTRAITS[seat.color]} alt="" />
                  </button>
                  <span className="seat__who">
                    <strong>
                      {fixed && i === 0 && <CrownIcon />}
                      {name}
                    </strong>
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
        <button type="button" className="menu__start" disabled={generating || (choice !== 'standin' && !parsed)} onClick={start}>
          <span>
            <PlayIcon />
            {m.menu.start}
          </span>
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
      <CursorTrail />
    </div>
  );
}
