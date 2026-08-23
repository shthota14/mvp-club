// Shared "editorial paper" theme for the Community and Idea Detail pages —
// previously declared identically (copy-pasted) as a local `const LIT` in
// both CommunityPage.tsx and IdeaDetailPage.tsx. Deduplicated here so the
// two pages provably share one source of truth instead of two objects that
// merely happened to match. Font values are now pulled from the site-wide
// type tokens (index.css) instead of their own hardcoded strings, so this
// theme moves automatically if the type system ever changes again.
export const LIT = {
  pageBg:           '#fbf8f2',
  card:             '#ffffff',
  cardTint:         '#faf6ee',
  text:             '#2b2318',
  muted:            '#8a7d64',
  secondary:        '#6b5d47',
  accent:           '#8a5a2b',
  accentSoft:       '#f3e7d4',
  accentSoftBorder: '#dfc9a3',
  border:           '#ece3d1',
  radius:           4,
  shadow:           '0 2px 14px rgba(70,50,15,.06)',
  headFont:         'var(--font-display)',
  bodyFont:         'var(--font-ui)',
  handFont:         'var(--font-hand)',
};
