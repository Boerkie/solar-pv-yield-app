import { CompassPreview } from './CompassPreview';
import { calculateDestinationPoint, calculateDistanceMetres, normaliseAzimuth } from '../utils/geo';
import { PVStringConfig } from '../types';

type StringEditorProps = {
  pvString: PVStringConfig;
  activeDrawStringId?: string;
  onChange: (pvString: PVStringConfig) => void;
  onStartDrawing: (stringId: string) => void;
  onStopDrawing: () => void;
  onRemove: (stringId: string) => void;
  canRemove: boolean;
};

export function StringEditor({ pvString, activeDrawStringId, onChange, onStartDrawing, onStopDrawing, onRemove, canRemove }: StringEditorProps) {
  const isDrawing = activeDrawStringId === pvString.id;

  function updateField(field: keyof PVStringConfig, value: number | string) {
    const nextString = {
      ...pvString,
      [field]: value
    };

    if (field === 'panelCount' || field === 'panelWatts') {
      nextString.capacityKwp = Number(((Number(nextString.panelCount) * Number(nextString.panelWatts)) / 1000).toFixed(3));
    }

    onChange(nextString);
  }

  function updateAzimuth(value: number) {
    const azimuthDegrees = normaliseAzimuth(value);
    const nextString = {
      ...pvString,
      azimuthDegrees
    };

    if (pvString.arrow) {
      const currentDistance = calculateDistanceMetres(pvString.arrow.start, pvString.arrow.end);
      nextString.arrow = {
        start: pvString.arrow.start,
        end: calculateDestinationPoint(pvString.arrow.start, currentDistance, azimuthDegrees)
      };
    }

    onChange(nextString);
  }

  return (
    <section className="string-editor">
      <div className="string-editor-header">
        <input
          className="string-name-input"
          value={pvString.name}
          onChange={(event) => updateField('name', event.target.value)}
          aria-label="String name"
        />
        <CompassPreview label={pvString.name} azimuthDegrees={pvString.azimuthDegrees} />
      </div>

      <div className="input-grid">
        <label>
          Panels
          <input type="number" min="1" value={pvString.panelCount} onChange={(event) => updateField('panelCount', Number(event.target.value))} />
        </label>
        <label>
          Panel W
          <input type="number" min="1" value={pvString.panelWatts} onChange={(event) => updateField('panelWatts', Number(event.target.value))} />
        </label>
        <label>
          DC kWp
          <input type="number" min="0" step="0.01" value={pvString.capacityKwp} onChange={(event) => updateField('capacityKwp', Number(event.target.value))} />
        </label>
        <label>
          Tilt °
          <input type="number" min="0" max="90" value={pvString.tiltDegrees} onChange={(event) => updateField('tiltDegrees', Number(event.target.value))} />
        </label>
        <label>
          Azimuth ° true
          <input type="number" min="0" max="359" value={pvString.azimuthDegrees} onChange={(event) => updateAzimuth(Number(event.target.value))} />
        </label>
        <label>
          Losses %
          <input type="number" min="0" max="60" value={pvString.lossPercent} onChange={(event) => updateField('lossPercent', Number(event.target.value))} />
        </label>
      </div>

      <label className="range-label">
        Rotate arrow manually
        <input type="range" min="0" max="359" value={pvString.azimuthDegrees} onChange={(event) => updateAzimuth(Number(event.target.value))} />
      </label>

      <div className="button-row array-action-row">
        <button type="button" className={isDrawing ? 'secondary-button active' : 'secondary-button'} onClick={() => onStartDrawing(pvString.id)}>
          {isDrawing ? 'Drawing active: click direction point' : 'Draw map arrow'}
        </button>
        {isDrawing ? (
          <button type="button" className="ghost-button" onClick={onStopDrawing}>Finish drawing</button>
        ) : null}
        <button
          type="button"
          className="remove-array-button"
          disabled={!canRemove}
          title={canRemove ? 'Remove ' + pvString.name : 'At least one solar array is required'}
          onClick={() => onRemove(pvString.id)}
        >
          Remove
        </button>
      </div>
    </section>
  );
}
