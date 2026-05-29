export class SolarProvider {
  async simulateString() {
    throw new Error('simulateString must be implemented by a solar data provider.');
  }
}

export class ProviderUnavailableError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'ProviderUnavailableError';
    this.cause = cause;
  }
}
