import { type ReactNode, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';

type Props = { title: string; onClose: () => void; className?: string; children: ReactNode; footer: ReactNode };

export function Dialog({ title, onClose, className, children, footer }: Props) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div
        className={cx('overlay__panel', 'dialog', className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
        <div className="overlay__actions">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}
