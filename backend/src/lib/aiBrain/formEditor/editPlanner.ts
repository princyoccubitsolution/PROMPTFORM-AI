import { IFormEditAction } from './interfaces';

export class EditPlanner {
  static plan(prompt: string): IFormEditAction {
    const text = prompt.toLowerCase();

    if (text.includes("delete") || text.includes("remove")) {
      const words = text.split(/\s+/);
      const delIdx = words.findIndex(w => w === 'delete' || w === 'remove');
      const targetLabel = delIdx !== -1 && delIdx < words.length - 1 ? words.slice(delIdx + 1).join(" ") : "";
      return {
        type: 'remove_field',
        targetLabel
      };
    }

    if (text.includes("rename") || text.includes("change title")) {
      return {
        type: 'rename_field',
        targetLabel: "email",
        payload: { newLabel: "Work Email" }
      };
    }

    if (text.includes("convert") || text.includes("dropdown") || text.includes("radio")) {
      return {
        type: 'convert_field',
        targetLabel: "country",
        payload: { newType: "dropdown" }
      };
    }

    if (text.includes("required") || text.includes("optional")) {
      return {
        type: 'toggle_required',
        targetLabel: "phone",
        payload: { required: text.includes("required") }
      };
    }

    if (text.includes("add") || text.includes("insert") || text.includes("create")) {
      const cleanPrompt = prompt.replace(/\b(add|insert|new|field|form)\b/gi, "").trim();
      return {
        type: 'add_field',
        targetLabel: cleanPrompt,
        payload: {
          type: cleanPrompt.toLowerCase().includes("upload") ? "file_upload" : "short_text"
        }
      };
    }

    return {
      type: 'unknown'
    };
  }
}
