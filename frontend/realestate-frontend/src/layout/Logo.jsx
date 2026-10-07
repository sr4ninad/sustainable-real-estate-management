export function LogoMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M3.5 11 12 4l8.5 7v8.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M12 18.5c-2.7-.3-3.9-2.4-3.4-4.9 2.4-.2 4.1.8 4.6 3M12 18.5c.2-2.7 1.7-4.4 4.2-4.8.4 2.5-1.1 4.3-4.2 4.8"
        fill="currentColor"
      />
    </svg>
  );
}

export default function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <LogoMark />
      </span>
      <div>
        <div className="brand-name">Verdant</div>
        <div className="brand-tag">Sustainable Real Estate</div>
      </div>
    </div>
  );
}
