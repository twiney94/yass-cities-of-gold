const US_STARS = [2, 4.4, 6.8].flatMap((y) => [1.6, 3.8, 6, 8.2].map((x) => [x + (y === 4.4 ? 1.1 : 0), y]));

export function UsFlag() {
  return (
    <svg className="flag" viewBox="0 0 24 16" aria-hidden="true">
      <rect width="24" height="16" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((stripe) => (
        <rect key={stripe} y={(stripe * 16) / 13} width="24" height={16 / 13} fill="#b22234" />
      ))}
      <rect width="10.4" height={(7 * 16) / 13} fill="#3c3b6e" />
      {US_STARS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.55" fill="#fff" />
      ))}
    </svg>
  );
}

export function FrFlag() {
  return (
    <svg className="flag" viewBox="0 0 24 16" aria-hidden="true">
      <rect width="8" height="16" fill="#002654" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#ed2939" />
    </svg>
  );
}
