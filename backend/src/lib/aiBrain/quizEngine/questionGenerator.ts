import { IQuestionMetadata } from './interfaces';

export class QuestionGenerator {
  static generate(domain: string, flatFields: any[]): IQuestionMetadata[] {
    return flatFields.map((field, idx) => {
      const isQuiz = domain === 'quiz';
      const label = field.label;
      const lowerLabel = label.toLowerCase();
      const isIdentity = lowerLabel.includes("name") || lowerLabel.includes("roll") || lowerLabel.includes("enrollment") || lowerLabel.includes("id code") || lowerLabel.includes("student id") || lowerLabel.includes("email");

      let type = field.type || "mcq";
      let options = Array.isArray(field.options) ? [...field.options] : [];

      if (isIdentity) {
        if (lowerLabel.includes("name")) {
          type = "name";
          options = [];
        } else if (lowerLabel.includes("email")) {
          type = "email";
          options = [];
        } else if (lowerLabel.includes("roll") || lowerLabel.includes("enrollment") || lowerLabel.includes("student id") || lowerLabel.includes("id code")) {
          type = "short_text";
          options = [];
        }
      } else if (isQuiz) {
        const isExplicitMcq = (options.length >= 3) || lowerLabel.includes("(mcq)") || (type === 'mcq' && options.length > 2);
        const isTrueFalse = !isExplicitMcq && ((options.length === 2 && options.some(o => o.toLowerCase().includes('true')) && options.some(o => o.toLowerCase().includes('false'))) || lowerLabel.includes("true or false") || lowerLabel.includes("true/false"));
        const isFillInBlank = !isExplicitMcq && !isTrueFalse && (type === "short_text" || lowerLabel.includes("fill-in-the-blank") || lowerLabel.includes("fill in the blank") || lowerLabel.includes("____") || lowerLabel.includes("blank"));
        const isCodingOrAlgorithm = !isExplicitMcq && !isTrueFalse && !isFillInBlank && (type === "long_text" || type === "feedback" || lowerLabel.includes("coding") || lowerLabel.includes("write a program") || lowerLabel.includes("write an algorithm") || lowerLabel.includes("c program") || lowerLabel.includes("write a c"));

        if (isCodingOrAlgorithm) {
          type = "long_text";
          options = [];
        } else if (isFillInBlank) {
          type = "short_text";
          options = [];
        } else if (isTrueFalse) {
          type = "mcq";
          options = ["True", "False"];
        } else {
          if (type === "standard-input" || !type) {
            type = "mcq";
          }
          if (options.length < 4 && (type === "mcq" || type === "one_option" || type === "dropdown" || type === "checkbox")) {
            const defaultOptions = ["Option A (Correct)", "Option B", "Option C", "Option D"];
            while (options.length < 4) {
              options.push(defaultOptions[options.length] || `Option ${options.length + 1}`);
            }
          }
        }
      }

      const q: IQuestionMetadata = {
        type,
        label,
        required: field.required !== undefined ? field.required : true,
        options
      };

      if (isIdentity) {
        (q as any).isIdentityField = true;
        (q as any).points = 0;
      } else if (isQuiz) {
        q.correctAnswer = field.correctAnswer || (q.options.length > 0 ? q.options[0] : (type === "long_text" ? "Algorithm / Code Implementation" : "Expected Answer"));
        q.explanation = field.explanation || `Verified explanation and analysis for "${label}".`;
        q.category = field.category || "Domain Knowledge";
        q.tags = field.tags || ["Evaluation", "Assessment"];
        q.points = field.points !== undefined ? Number(field.points) : 2;
        q.difficulty = field.difficulty || "Intermediate";
        q.estimatedTimeSeconds = 60;
        q.learningObjective = "Evaluate understanding of subject matter.";
        q.bloomsTaxonomy = "understanding";
      }

      return q;
    });
  }
}
