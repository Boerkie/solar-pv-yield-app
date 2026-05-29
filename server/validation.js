export function validateSimulationRequest(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return ['Request body is required.'];
  }

  if (!payload.site || typeof payload.site !== 'object') {
    errors.push('Site is required.');
  } else {
    validateRange(errors, payload.site.latitude, -90, 90, 'Latitude');
    validateRange(errors, payload.site.longitude, -180, 180, 'Longitude');
  }

  if (!Array.isArray(payload.strings) || payload.strings.length === 0) {
    errors.push('At least one PV array is required.');
  } else {
    payload.strings.forEach((pvString, index) => validatePvString(errors, pvString, index));
  }

  return errors;
}

function validatePvString(errors, pvString, index) {
  const label = pvString?.name || `String ${index + 1}`;

  if (!pvString || typeof pvString !== 'object') {
    errors.push(`${label} is invalid.`);
    return;
  }

  if (!pvString.id || typeof pvString.id !== 'string') {
    errors.push(`${label} requires a stable string id.`);
  }

  if (!pvString.name || typeof pvString.name !== 'string') {
    errors.push(`${label} requires a name.`);
  }

  validatePositive(errors, pvString.panelCount, `${label} panel count`);
  validatePositive(errors, pvString.panelWatts, `${label} panel wattage`);
  validatePositive(errors, pvString.capacityKwp, `${label} DC capacity`);
  validateRange(errors, pvString.tiltDegrees, 0, 90, `${label} tilt`);
  validateRange(errors, pvString.azimuthDegrees, 0, 359, `${label} azimuth`);
  validateRange(errors, pvString.lossPercent, 0, 60, `${label} system losses`);
}

function validatePositive(errors, value, label) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    errors.push(`${label} must be a positive number.`);
  }
}

function validateRange(errors, value, min, max, label) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < min || numericValue > max) {
    errors.push(`${label} must be between ${min} and ${max}.`);
  }
}
