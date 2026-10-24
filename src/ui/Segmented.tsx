import type { ReactNode } from 'react';
import { cx } from './cx';

export type Option<T> = { value: T; label: string; icon?: ReactNode };

type Props<T> = { label: string; options: Option<T>[]; value: T; onChange: (value: T) => void; className?: string };

export function Segmented<T extends string | number>(props: Props<T>) {
  return (
    <div className={cx('segmented', props.className)} role="radiogroup" aria-label={props.label}>
      {props.options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={props.value === option.value}
          className={cx('segmented__option', props.value === option.value && 'is-on')}
          aria-label={option.icon ? option.label : undefined}
          title={option.icon ? option.label : undefined}
          onClick={() => props.onChange(option.value)}
        >
          {option.icon ?? option.label}
        </button>
      ))}
    </div>
  );
}
