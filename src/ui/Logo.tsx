import type { Ref } from 'react';
import { cx } from './cx';

type Props = { small?: boolean; presents?: string; yassRef?: Ref<HTMLSpanElement> };

export function Logo({ small, presents, yassRef }: Props) {
  return (
    <div className={cx('logo', small && 'logo--small')} role="img" aria-label="Yass' Cities of Gold">
      <span className="logo__yass" aria-hidden ref={yassRef}>
        <span className="logo__name">Yass</span>
        <span className="logo__apostrophe">'</span>
        {presents && <span className="logo__presents">{presents}</span>}
      </span>
      <span className="logo__title" aria-hidden>
        Cities of Gold<span className="logo__tm">™</span>
      </span>
    </div>
  );
}
