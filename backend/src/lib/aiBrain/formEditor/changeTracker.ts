export interface IFormDelta {
  operation: string;
  fieldLabel: string;
  details?: string;
}

export class ChangeTracker {
  static getChanges(before: any, after: any): IFormDelta[] {
    const deltas: IFormDelta[] = [];
    const beforeLabels = new Set<string>((before.questions || []).map((q: any) => String(q.label)));
    const afterLabels = new Set<string>((after.questions || []).map((q: any) => String(q.label)));

    // Removed
    for (const label of beforeLabels) {
      if (!afterLabels.has(label)) {
        deltas.push({ operation: "remove", fieldLabel: label });
      }
    }

    // Added
    for (const label of afterLabels) {
      if (!beforeLabels.has(label)) {
        deltas.push({ operation: "add", fieldLabel: label });
      }
    }

    return deltas;
  }
}
