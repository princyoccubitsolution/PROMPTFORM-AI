export class FieldSuggestion {
  static suggest(domain: string): string[] {
    if (domain === 'medical') {
      return [
        "Insurance Card Upload",
        "Medical Report File Upload",
        "Digital Signature Consent Form",
        "Photo Upload ID Card",
        "Emergency Contact Details"
      ];
    }
    if (domain === 'job') {
      return [
        "Upload PDF Resume File",
        "GitHub Link Profile",
        "LinkedIn Link Profile",
        "Applicant E-Signature Code"
      ];
    }
    return [
      "Contact Details Details",
      "Overall Satisfaction Scale"
    ];
  }
}
