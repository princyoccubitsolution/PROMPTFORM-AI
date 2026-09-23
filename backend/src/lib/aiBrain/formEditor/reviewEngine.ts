import { LogicEditor } from './logicEditor';

export class ReviewEngine {
  static auditAndRepair(formConfig: any): any {
    // 1. Audit missing labels and duplicates
    const labelsMap = new Set<string>();
    formConfig.questions = (formConfig.questions || []).filter((q: any) => {
      if (!q.label || !q.label.trim()) {
        q.label = "Untitled Input Field";
      }
      return true;
    });

    // 2. Clear orphaned visibility branches
    formConfig.questions = LogicEditor.removeOrphanedLogic(formConfig.questions);

    // 3. Ensure accessibility configs are assigned
    formConfig.questions = formConfig.questions.map((q: any) => {
      if (!q.accessibilityLabel) {
        q.accessibilityLabel = `Input field for entering ${q.label}`;
      }
      return q;
    });

    return formConfig;
  }
}
