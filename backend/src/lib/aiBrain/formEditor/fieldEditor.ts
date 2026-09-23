export class FieldEditor {
  static rename(questions: any[], oldLabelPattern: string, newLabel: string): any[] {
    return questions.map(q => {
      if (q.label.toLowerCase().includes(oldLabelPattern.toLowerCase())) {
        return {
          ...q,
          label: newLabel,
          accessibilityLabel: `Input field for entering ${newLabel}`
        };
      }
      return q;
    });
  }

  static convertType(questions: any[], labelPattern: string, newType: string): any[] {
    return questions.map(q => {
      if (q.label.toLowerCase().includes(labelPattern.toLowerCase())) {
        return {
          ...q,
          type: newType,
          options: newType === 'dropdown' || newType === 'mcq' ? ["Option A", "Option B"] : []
        };
      }
      return q;
    });
  }

  static toggleRequired(questions: any[], labelPattern: string, required: boolean): any[] {
    return questions.map(q => {
      if (q.label.toLowerCase().includes(labelPattern.toLowerCase())) {
        return {
          ...q,
          required
        };
      }
      return q;
    });
  }
}
