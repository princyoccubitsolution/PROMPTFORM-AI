import { IFormDiff } from './interfaces';

export class EditTracker {
  static createDiff(
    action: IFormDiff['action'], 
    targetField?: string, 
    details?: string
  ): IFormDiff {
    return {
      action,
      targetField,
      details,
      timestamp: new Date().toISOString()
    };
  }

  static appendDiff(diffs: IFormDiff[], diff: IFormDiff, limit = 50): IFormDiff[] {
    const newDiffs = [...diffs, diff];
    if (newDiffs.length > limit) {
      newDiffs.shift();
    }
    return newDiffs;
  }
}
