export class PublicRequestError extends Error {
  public readonly status: number;

  public constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
