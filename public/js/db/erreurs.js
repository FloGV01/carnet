export class DataError extends Error {
  constructor(code, message, details) {
    super(message || code);
    this.name = 'DataError';
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}
