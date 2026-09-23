import { IVersionCheckpoint } from './interfaces';

export class VersionManager {
  private checkpoints: IVersionCheckpoint[] = [];

  saveVersion(formSnapshot: any, description: string): string {
    const id = `ver_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.checkpoints.push({
      id,
      timestamp: Date.now(),
      description,
      formSnapshot: JSON.parse(JSON.stringify(formSnapshot))
    });
    return id;
  }

  getVersion(id: string): any | null {
    const cp = this.checkpoints.find(c => c.id === id);
    return cp ? cp.formSnapshot : null;
  }

  getHistory(): Omit<IVersionCheckpoint, 'formSnapshot'>[] {
    return this.checkpoints.map(c => ({
      id: c.id,
      timestamp: c.timestamp,
      description: c.description
    }));
  }
}
