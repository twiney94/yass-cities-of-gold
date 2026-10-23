import { STANDIN_ROUTE } from './content/standin';
import { GameScreen } from './ui/GameScreen';
import { useGame } from './ui/store';

export default function App() {
  const playing = useGame((s) => s.game !== null);
  const newGame = useGame((s) => s.newGame);

  if (playing) return <GameScreen />;
  return (
    <div className="setup">
      <h1>El Dorado</h1>
      <p className="muted">Race through the jungle. Route: {STANDIN_ROUTE.name}</p>
      <div className="setup__choices">
        {([2, 3, 4] as const).map((count) => (
          <button key={count} type="button" className="btn btn--primary btn--big" onClick={() => newGame(count)}>
            {count} players
          </button>
        ))}
      </div>
      <p className="muted setup__note">Players share this device and pass it between turns.</p>
    </div>
  );
}
