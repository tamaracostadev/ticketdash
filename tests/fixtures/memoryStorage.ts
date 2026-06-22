export class MemoryStorage implements Storage {
  readonly #data = new Map<string, string>();

  public get length(): number {
    return this.#data.size;
  }

  public clear(): void {
    this.#data.clear();
  }

  public getItem(key: string): string | null {
    return this.#data.get(key) ?? null;
  }

  public key(index: number): string | null {
    return [...this.#data.keys()][index] ?? null;
  }

  public removeItem(key: string): void {
    this.#data.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.#data.set(key, value);
  }
}
