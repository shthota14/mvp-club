import React from 'react';

// Shared button primitive — pulls its look entirely from the CSS tokens in
// index.css (--font-ui, --r-sm, --text-primary, --sep) instead of each call
// site hand-rolling its own inline style object. See the design-consistency
// audit: every button in the app used to be a one-off, which is how radius
// and shadow drift happened in the first place.

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: React.CSSProperties;
}

const BASE: React.CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontWeight: 700,
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  transition: 'opacity .15s ease, transform .1s ease',
  whiteSpace: 'nowrap',
};

const SIZES: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '5px 12px', borderRadius: 'var(--r-sm)', fontSize: 11 },
  md: { padding: '9px 18px', borderRadius: 'var(--r-sm)', fontSize: 13 },
};

const VARIANTS: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: 'var(--text-primary)', color: '#fff' },
  secondary: { background: '#fff', color: 'var(--text-secondary)', border: '1.5px solid var(--sep)' },
  ghost:     { background: 'none', color: 'var(--text-secondary)' },
};

export default function Button({
  variant = 'primary',
  size = 'md',
  style,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      style={{
        ...BASE,
        ...SIZES[size],
        ...VARIANTS[variant],
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'default' : 'pointer',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
