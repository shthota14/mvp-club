// ── Sage avatar - the illustrated wizard mark used anywhere the
// AI-assisted mode is referenced, so it reads as a character ("Sage")
// rather than a generic robot icon. Backed by a real image (public/sage/
// sage-avatar.png) instead of an inline SVG, framed in a circle that
// matches the app's existing purple accent ring.
//
// Originally defined inline in WorkPage.tsx (Validate step 7's AI-assisted
// discovery guide) — pulled out into its own shared component so the
// Business Model Canvas "Ask Sage" tab (IdeaCanvasModal.tsx) and the Sage
// Pitch Draft modal (SagePitchDraftModal.tsx) can reuse the exact same
// mark without a circular import back into WorkPage.tsx. WorkPage.tsx now
// imports this instead of defining its own copy.
export default function SageAvatar({ size = 84 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: '#EDE9FE',
        border: '1.2px solid #C4B5FD',
        boxSizing: 'border-box',
      }}
    >
      <img
        src="/sage/sage-avatar.png"
        alt="Sage"
        width={size}
        height={size}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </span>
  );
}
