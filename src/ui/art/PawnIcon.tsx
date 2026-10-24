import { cx } from '../cx';
import { PAWN_LAYERS, PAWN_SILHOUETTE, PAWN_VIEWBOX } from './pawn';

export function PawnIcon({ color, className }: { color: string; className?: string }) {
  return (
    <svg className={cx('pawn', className)} viewBox={PAWN_VIEWBOX} aria-hidden="true">
      <path className="pawn__outline" d={PAWN_SILHOUETTE} />
      {PAWN_LAYERS.map((layer) => (
        <path key={layer.d} d={layer.d} fill={layer.fill === 'player' ? color : layer.fill} fillOpacity={layer.alpha} />
      ))}
    </svg>
  );
}
