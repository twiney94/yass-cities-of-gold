import { cx } from './cx';

export function Logo({ small }: { small?: boolean }) {
  return (
    <div className={cx('logo', small && 'logo--small')} role="img" aria-label="Yass' Cities of Gold">
      <span className="logo__yass" aria-hidden>
        Yass'
      </span>
      <span className="logo__title" aria-hidden>
        Cities of Gold
      </span>
    </div>
  );
}
