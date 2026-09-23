export class AutoImprover {
  static improve(questions: any[]): any[] {
    return questions.map(q => {
      // Improve placeholder guide descriptions
      if (!q.placeholder || !q.placeholder.trim()) {
        const label = q.label.toLowerCase();
        if (label.includes("email")) {
          q.placeholder = "e.g. john.doe@domain.com";
        } else if (label.includes("phone")) {
          q.placeholder = "e.g. +1 555 123 4567";
        } else {
          q.placeholder = `Enter your details for ${q.label}`;
        }
      }
      return q;
    });
  }
}
