export class HistoryEngine {
  private log: string[] = [];

  appendLog(message: string): void {
    this.log.push(`[${new Date().toISOString()}] ${message}`);
  }

  getLogs(): string[] {
    return this.log;
  }
}
