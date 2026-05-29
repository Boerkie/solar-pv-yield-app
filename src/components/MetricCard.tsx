type MetricCardProps = {
  label: string;
  value: string;
  helpText?: string;
};

export function MetricCard({ label, value, helpText }: MetricCardProps) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {helpText ? <small>{helpText}</small> : null}
    </div>
  );
}
