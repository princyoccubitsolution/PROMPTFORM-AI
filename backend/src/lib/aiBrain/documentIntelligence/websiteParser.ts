import { IDocParsedPlan } from './interfaces';

export class WebsiteParser {
  static parseUrl(url: string): IDocParsedPlan {
    // Simulated HTML DOM form control sifter
    return {
      title: "Web Portal Registration Form",
      description: `Migrated form controls fetched from: ${url}`,
      fields: [
        { type: "short_text", label: "User Name ID", required: true, options: [] },
        { type: "short_text", label: "Contact Phone Number", required: true, options: [] },
        { type: "file_upload", label: "Profile Attachment Upload", required: false, options: [] }
      ],
      sourceType: "url"
    };
  }
}
