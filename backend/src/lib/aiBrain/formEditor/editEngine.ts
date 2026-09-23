import { EditPlanner } from './editPlanner';
import { FieldEditor } from './fieldEditor';
import { SectionEditor } from './sectionEditor';
import { LayoutEditor } from './layoutEditor';
import { ValidationEditor } from './validationEditor';
import { LogicEditor } from './logicEditor';
import { TranslationEditor } from './translationEditor';
import { VersionManager } from './versionManager';
import { UndoRedoStack } from './undoRedo';
import { ChangeTracker } from './changeTracker';
import { ReviewEngine } from './reviewEngine';

export class EnterpriseFormEditor {
  private static versionManager = new VersionManager();
  private static undoRedoStack = new UndoRedoStack();

  static applyEdit(existingForm: any, prompt: string): { formConfig: any; suggestions: string[] } {
    // 1. Back up snapshot
    this.versionManager.saveVersion(existingForm, `Before: ${prompt}`);
    this.undoRedoStack.pushState(existingForm);

    let questions = Array.isArray(existingForm.questions) ? [...existingForm.questions] : [];
    let config = { ...existingForm, questions };

    // 2. Plan edit
    const action = EditPlanner.plan(prompt);

    // 3. Apply updates
    if (action.type === 'remove_field' && action.targetLabel) {
      const target = action.targetLabel.toLowerCase();
      config.questions = questions.filter(q => !q.label.toLowerCase().includes(target));
    } else if (action.type === 'rename_field' && action.targetLabel && action.payload) {
      config.questions = FieldEditor.rename(questions, action.targetLabel, action.payload.newLabel);
    } else if (action.type === 'convert_field' && action.targetLabel && action.payload) {
      config.questions = FieldEditor.convertType(questions, action.targetLabel, action.payload.newType);
    } else if (action.type === 'toggle_required' && action.targetLabel && action.payload) {
      config.questions = FieldEditor.toggleRequired(questions, action.targetLabel, action.payload.required);
    } else if (action.type === 'add_field' && action.targetLabel && action.payload) {
      config.questions.push({
        type: action.payload.type,
        label: action.targetLabel,
        required: false,
        options: [],
        accessibilityLabel: `Input field for entering ${action.targetLabel}`
      });
    }

    // 4. Audit & Quality checks repairs
    config = ReviewEngine.auditAndRepair(config);

    // 5. Build dynamic suggestions
    const suggestions: string[] = [];
    if (prompt.toLowerCase().includes("resume")) {
      suggestions.push("Portfolio Upload Link", "LinkedIn Profile URL", "Expected Salary (USD)", "Notice Period");
    } else {
      suggestions.push("Overall Satisfaction Rating", "Feedback Comments Area");
    }

    return {
      formConfig: config,
      suggestions
    };
  }
}
