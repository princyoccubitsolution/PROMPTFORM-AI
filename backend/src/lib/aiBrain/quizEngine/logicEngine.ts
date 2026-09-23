import { IQuestionMetadata } from './interfaces';

export class LogicEngine {
  static attachSkipLogic(questions: IQuestionMetadata[]): IQuestionMetadata[] {
    return questions.map(q => {
      // Map basic check trigger
      if (q.label.toLowerCase().includes("attendance")) {
        q.logic = {
          action: "show",
          target_question_id: "Dietary",
          condition: {
            operator: "equals",
            value: "Yes"
          }
        };
      }
      return q;
    });
  }
}
