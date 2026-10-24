const Icon = ({ d, fill }: { d: string; fill?: boolean }) => (
  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d={d}
      fill={fill ? 'currentColor' : 'none'}
      stroke={fill ? 'none' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CopyIcon = () => <Icon d="M9 9h10v11H9zM5 15V4h10" />;
export const CheckIcon = () => <Icon d="M5 12.5l4.5 4.5L19 7.5" />;
export const RefreshIcon = () => <Icon d="M20 11a8 8 0 0 0-14.5-4.5M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5M20 20v-4h-4" />;
export const CrownIcon = () => <Icon d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z" fill />;
export const PlayIcon = () => <Icon d="M7 4.5v15L19.5 12z" fill />;
