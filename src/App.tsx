import { Suspense, lazy, useEffect, useState } from 'react';
import type { GameMap } from './ui/maps';
import { type Mode, SetupScreen, TitleScreen } from './ui/menu';
import { type Seat, useGame } from './ui/store';

const loadGameScreen = () => import('./ui/GameScreen');
const GameScreen = lazy(() => loadGameScreen().then((module) => ({ default: module.GameScreen })));

type Screen = { kind: 'title' } | { kind: 'setup'; mode: Mode };

export default function App() {
  const playing = useGame((s) => s.game !== null);
  const newGame = useGame((s) => s.newGame);
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
    newGame(seats, map);
  };

  return screen.kind === 'title' ? (
    <TitleScreen onMode={(mode) => setScreen({ kind: 'setup', mode })} />
  ) : (
    <SetupScreen key={screen.mode} mode={screen.mode} onBack={() => setScreen({ kind: 'title' })} onStart={start} />
  );
}
