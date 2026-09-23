import { IFormDiff } from './interfaces';

export class ContextResolver {
  static resolveIntent(prompt: string): IFormDiff['action'] {
    const text = prompt.toLowerCase();

    if (text.includes("delete") || text.includes("remove") || text.includes("discard")) {
      return 'delete';
    }
    if (text.includes("move") || text.includes("reorder") || text.includes("shift")) {
      return 'move';
    }
    if (text.includes("rename") || text.includes("change title") || text.includes("change label")) {
      return 'rename';
    }
    if (text.includes("translate") || text.includes("translation") || text.includes("anuvad")) {
      return 'translate';
    }
    if (text.includes("mobile") || text.includes("responsive") || text.includes("phone friendly")) {
      return 'improve_mobile_layout';
    }
    if (text.includes("accessibility") || text.includes("accessible") || text.includes("wcag")) {
      return 'improve_accessibility';
    }
    if (text.includes("validation") || text.includes("validate") || text.includes("verify")) {
      return 'improve_validation';
    }
    if (text.includes("logic") || text.includes("branching") || text.includes("conditional")) {
      return 'improve_logic';
    }
    if (text.includes("enterprise") || text.includes("professional") || text.includes("premium")) {
      return 'improve_enterprise_quality';
    }
    if (text.includes("ux") || text.includes("look") || text.includes("style") || text.includes("layout")) {
      return 'improve_ux';
    }
    if (text.includes("edit") || text.includes("update") || text.includes("modify") || text.includes("change")) {
      return 'edit';
    }

    return 'create';
  }
}
