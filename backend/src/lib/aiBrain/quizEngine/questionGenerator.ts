import { IQuestionMetadata } from './interfaces';

export class QuestionGenerator {
  static generate(domain: string, flatFields: any[]): IQuestionMetadata[] {
    return flatFields.map((field, idx) => {
      const isQuiz = domain === 'quiz';
      const label = field.label;
      const lowerLabel = label.toLowerCase();
      const isIdentity = lowerLabel.includes("name") || lowerLabel.includes("roll") || lowerLabel.includes("id code") || lowerLabel.includes("student id") || lowerLabel.includes("email");

      let type = field.type || "mcq";
      let options = Array.isArray(field.options) ? [...field.options] : [];

      if (isQuiz && !isIdentity) {
        if (type === "short_text" || type === "long_text" || type === "standard-input" || !type) {
          type = "mcq";
        }
        if (options.length < 4 && (type === "mcq" || type === "one_option" || type === "dropdown" || type === "checkbox")) {
          const defaultOptions = ["Option A (Correct)", "Option B", "Option C", "Option D"];
          while (options.length < 4) {
            options.push(defaultOptions[options.length] || `Option ${options.length + 1}`);
          }
        }
      }

      const q: IQuestionMetadata = {
        type,
        label,
        required: field.required !== undefined ? field.required : true,
        options
      };

      if (isQuiz && !isIdentity) {
        q.correctAnswer = field.correctAnswer || (q.options.length > 0 ? q.options[0] : "Option A");
        q.explanation = field.explanation || `Choice '${q.correctAnswer}' is the verified answer for "${label}".`;
        q.category = field.category || "Domain Knowledge";
        q.tags = field.tags || ["Evaluation", "Assessment"];
        q.points = field.points !== undefined ? Number(field.points) : 10;
        q.difficulty = field.difficulty || "Intermediate";
        q.estimatedTimeSeconds = 60;
        q.learningObjective = "Evaluate understanding of subject matter.";
        q.bloomsTaxonomy = "understanding";
      }

      return q;
    });
  }
}
