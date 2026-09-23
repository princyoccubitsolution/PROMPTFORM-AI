export class TranslationEditor {
  static translateFields(questions: any[], dictionary: Record<string, string>): any[] {
    return questions.map(q => {
      const translatedLabel = dictionary[q.label] || dictionary[q.label.toLowerCase()];
      if (translatedLabel) {
        return {
          ...q,
          label: translatedLabel,
          accessibilityLabel: `Input field for entering ${translatedLabel}`
        };
      }
      return q;
    });
  }
}
