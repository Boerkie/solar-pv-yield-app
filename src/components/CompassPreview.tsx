type CompassPreviewProps = {
  azimuthDegrees: number;
  label: string;
};

export function CompassPreview({ azimuthDegrees, label }: CompassPreviewProps) {
  return (
    <div className="compass-card" aria-label={`${label} azimuth preview`}>
      <svg viewBox="0 0 120 120" className="compass-svg" role="img">
        <circle cx="60" cy="60" r="52" className="compass-ring" />
        <text x="60" y="18" textAnchor="middle" className="compass-label">N</text>
        <text x="104" y="64" textAnchor="middle" className="compass-label">E</text>
        <text x="60" y="112" textAnchor="middle" className="compass-label">S</text>
        <text x="16" y="64" textAnchor="middle" className="compass-label">W</text>
        <g transform={`rotate(${azimuthDegrees} 60 60)`}>
          <line x1="60" y1="60" x2="60" y2="24" className="compass-needle" />
          <polygon points="60,16 54,30 66,30" className="compass-arrow" />
        </g>
        <circle cx="60" cy="60" r="4" className="compass-centre" />
      </svg>
      <div>
        <strong>{label}</strong>
        <span>{azimuthDegrees.toFixed(1)}° true</span>
      </div>
    </div>
  );
}
