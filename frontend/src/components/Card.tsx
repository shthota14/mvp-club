import React from 'react';

// Shared card/surface primitive — see Button.tsx for why this exists. Built
// on the same tokens (--surface, --sep, --r, --shadow-sm/md).

type CardPadding = 'sm' | 'md' | 'lg';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
  padding?: CardPadding;
  interactive?: boolean;
  style?: React.CSSProperties;
}

const PADDING: Record<CardPadding, string> = {
  sm: '12px 14px',
  md: '18px 20px',
  lg: '24px 28px',
};

export default function Card({
  padding = 'md',
  interactive = false,
  className,
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={interactive ? ['mvpc-card-interactive', className].filter(Boolean).join(' ') : className}
      style={{
        background: 'var(--surface)',
        border: '1.5px solid var(--sep)',
        borderRadius: 'var(--r)',
        padding: PADDING[padding],
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
