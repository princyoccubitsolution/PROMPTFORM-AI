import { IntentContext } from './intentDetector';

export interface FormRequirements {
  fieldCount: number;
  requestedFields: string[];
  implicitFields: string[];
}

export class RequirementAnalyzer {
  static analyze(context: IntentContext, domain: string): FormRequirements {
    const normalized = context.normalizedPrompt;
    
    const digitExtract = normalized.match(/\d+/);
    const fieldCount = digitExtract ? parseInt(digitExtract[0]) : 6;

    const requestedFields: string[] = [];
    if (normalized.includes("email")) requestedFields.push("Email");
    if (normalized.includes("phone") || normalized.includes("mobile")) requestedFields.push("Phone Number");
    if (normalized.includes("name")) requestedFields.push("Full Name");
    if (normalized.includes("file") || normalized.includes("upload") || normalized.includes("photo")) requestedFields.push("File Upload");

    let implicitFields: string[] = [];
    if (domain === 'quiz') {
      implicitFields = ["Score", "Knowledge Level", "Grade Level", "Feedback"];
    } else if (domain === 'rsvp') {
      implicitFields = ["Attendance Confirmation", "Number of Guests", "Dietary Restrictions", "Parking Assistance"];
    } else if (domain === 'job') {
      implicitFields = ["Full Name", "Email Address", "Phone Number", "Role Applied For", "Resume File Upload"];
    } else if (domain === 'contact') {
      implicitFields = ["Full Name", "Email Address", "Phone Number", "Message Details"];
    } else if (domain === 'medical') {
      implicitFields = ["Patient Full Name", "Date of Birth", "Blood Group", "Medical History"];
    }

    return {
      fieldCount,
      requestedFields,
      implicitFields
    };
  }
}
