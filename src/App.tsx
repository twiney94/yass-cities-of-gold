import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { DiceRoll } from './ui/DiceRoll';
import type { GameMap } from './ui/maps';
import { type Mode, SetupScreen, TitleScreen } from './ui/menu';
import { loadSave } from './ui/save';
import { type Seat, useGame } from './ui/store';

const loadGameScreen = () => import('./ui/GameScreen');
const GameScreen = lazy(() => loadGameScreen().then((module) => ({ default: module.GameScreen })));

type Screen = { kind: 'title' } | { kind: 'setup'; mode: Mode };

export default function App() {
  const playing = useGame((s) => s.game !== null);
  const roll = useGame((s) => s.roll);
  const prepare = useGame((s) => s.prepare);
  const begin = useGame((s) => s.begin);
  const resume = useGame((s) => s.resume);
  const save = useMemo(() => (playing || roll ? null : loadSave()), [playing, roll]);
  const [screen, setScreen] = useState<Screen>({ kind: 'title' });

  useEffect(() => {
    void loadGameScreen();
  }, []);

  if (playing) {
    return (
      <Suspense fallback={<div className="menu" />}>
        <GameScreen />
      </Suspense>
    );
  }

  const start = (seats: Seat[], map: GameMap) => {
    setScreen({ kind: 'title' });
    prepare(seats, map);
  };

  return (
    <>
      {screen.kind === 'title' ? (
        <TitleScreen save={save} onMode={(mode) => setScreen({ kind: 'setup', mode })} onContinue={() => save && resume(save)} />
      ) : (
        <SetupScreen key={screen.mode} mode={screen.mode} onBack={() => setScreen({ kind: 'title' })} onStart={start} />
      )}
      {roll && <DiceRoll roll={roll} onDone={begin} />}
    </>
  );
}
