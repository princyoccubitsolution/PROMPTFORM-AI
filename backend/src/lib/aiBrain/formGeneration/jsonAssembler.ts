import { IFieldPlan } from '../fieldIntelligence/interfaces';
import { IFormLayout } from './interfaces';
import { sanitizeFormTitle } from '../../titleSanitizer';

export class JsonAssembler {
  static assemble(plan: IFieldPlan, layout: IFormLayout, flatQuestions: any[]): any {
    const text = plan.normalizedPrompt?.toLowerCase() || "";
    const isMedical = plan.domain === 'medical' || text.includes("hospital") || text.includes("medical");
    const isEducation = plan.industry === 'Education' || text.includes("school") || text.includes("college") || text.includes("admission");
    const isTech = text.includes("tech") || text.includes("science") || text.includes("antigravity") || text.includes("aerospace");
    const isReview = plan.domain === 'survey' || text.includes("review") || text.includes("feedback") || text.includes("restaurant");

    // Extract clean topic name and form title
    let formTitle = "";

    // Check for explicit user title override commands
    const explicitTitleMatch = plan.normalizedPrompt?.match(/(?:change title to|rename title to|set title to|title is|title:)\s*["']?([^"'\n\r,]+)["']?/i);
    if (explicitTitleMatch && explicitTitleMatch[1] && explicitTitleMatch[1].trim().length > 1) {
      formTitle = explicitTitleMatch[1].trim();
    } else if ((plan as any)?.title && typeof (plan as any).title === 'string' && (plan as any).title.length > 3 && (plan as any).title.length < 50 && !(plan as any).title.toLowerCase().includes("with net promoter") && !(plan as any).title.toLowerCase().includes("set 10 minutes") && !(plan as any).title.toLowerCase().includes("anti cheat")) {
      formTitle = (plan as any).title;
    }

    if (!formTitle) {
      if (text.includes("gta v") || text.includes("gta 5") || text.includes("grand theft auto")) {
        formTitle = plan.domain === 'quiz' ? "GTA V Gaming Quiz" : "GTA V Feedback Form";
      } else if (text.includes("minecraft")) {
        formTitle = plan.domain === 'quiz' ? "Minecraft Gaming Quiz" : "Minecraft Feedback Form";
      } else if (text.includes("valorant")) {
        formTitle = plan.domain === 'quiz' ? "Valorant Esports Quiz" : "Valorant Feedback Form";
      } else if (text.includes("cricket")) {
        formTitle = plan.domain === 'quiz' ? "Cricket World Cup Quiz" : "Cricket Feedback Form";
      } else if (text.includes("customer") && (text.includes("feedback") || text.includes("survey") || text.includes("nps") || text.includes("net promoter") || text.includes("satisfaction"))) {
        formTitle = "Customer Feedback Survey";
      } else if (text.includes("nps") || text.includes("net promoter")) {
        formTitle = "Net Promoter Score (NPS) Survey";
      } else if (text.includes("employee") && (text.includes("feedback") || text.includes("survey"))) {
        formTitle = "Employee Feedback Survey";
      } else if (text.includes("patient") || text.includes("dental") || text.includes("medical")) {
        formTitle = "Patient Intake & Medical Form";
      } else if (text.includes("event") || text.includes("rsvp") || text.includes("conference")) {
        formTitle = "Event Registration & RSVP";
      } else if (text.includes("travel") || text.includes("booking")) {
        formTitle = "Travel Booking Request Form";
      } else {
        let topicClean = (plan.normalizedPrompt || "")
          .replace(/\b(\d+[\s\-]question|\d+|\d+\-question|create|make|generate|build|form|survey|quiz|test|exam|created|built|please|for|a|an|the|around|questions|form type|feedback|intake|application|rsvp|medical|with|net promoter score|net|promoter|score|rating|ratings|scale|scales|and|or|set|minutes|timer|anti[\s\-]?cheat|add|marks|options|exact|correct|answers|this|id|number|field|remove)\b/gi, "")
          .replace(/\([^)]*\)/g, "")
          .replace(/[\-\_\.]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        // Cut off instructions after conjunctions
        topicClean = topicClean.split(/\b(with|using|use|containing|include|including|having|after|where|for|by|based\s+on)\b/i)[0].trim();

        let topicName = "";
        if (topicClean.length > 1) {
          let words = topicClean.split(/\s+/).filter(w => w.length > 1 && !["this", "id", "remove", "field"].includes(w.toLowerCase()));
          if (words.length > 0) {
            if (words.length > 4) words = words.slice(0, 4);
            topicName = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          }
        }

        if (!topicName || topicName.length > 30) {
          topicName = text.includes("javascript") || text.includes("js") ? "JavaScript" :
                      text.includes("python") ? "Python" :
                      text.includes("react") ? "React" :
                      text.includes("node") ? "Node.js" :
                      text.includes("coffee") ? "Coffee Shop" :
                      text.includes("dentist") || text.includes("dental") ? "Dentistry" :
                      text.includes("travel") || text.includes("booking") ? "Travel Booking" :
                      text.includes("food") || text.includes("restaurant") ? "Food & Dining" : "Topic";
        }

        if (plan.domain === 'quiz') {
          formTitle = topicName.includes("Quiz") ? topicName : `${topicName} Quiz`;
        } else if (plan.domain === 'survey') {
          formTitle = topicName.includes("Survey") ? topicName : `${topicName} Survey`;
        } else if (plan.domain === 'job') {
          formTitle = topicName.includes("Application") ? topicName : `${topicName} Application Form`;
        } else if (plan.domain === 'rsvp') {
          formTitle = topicName.includes("RSVP") || topicName.includes("Invitation") ? topicName : `${topicName} Event RSVP`;
        } else if (plan.domain === 'medical') {
          formTitle = topicName.includes("Intake") || topicName.includes("Medical") ? topicName : `${topicName} Medical Intake Form`;
        } else {
          formTitle = topicName.includes("Form") ? topicName : `${topicName} Form`;
        }
      }
    }

    // Always sanitize formTitle to guarantee smart, sleek 2-4 word human title
    formTitle = sanitizeFormTitle(formTitle, plan.normalizedPrompt);

    // Determine Topic-Specific Niche Theme (Matching HSL / Brand niche rules)
    let themeName = "royal-blue-education";
    let layoutType = "compact-grid";
    let primaryColor = "#2563eb"; // Royal Blue default
    let backgroundColor = "#eff6ff";

    if (isMedical || text.includes("dental") || text.includes("dentistry") || text.includes("health")) {
      themeName = "emerald-medical";
      layoutType = "wizard-steps";
      primaryColor = "#059669"; // Emerald Green
      backgroundColor = "#ecfdf5";
    } else if (isReview || text.includes("coffee") || text.includes("cafe") || text.includes("food") || text.includes("restaurant") || text.includes("bakery")) {
      themeName = "amber-warm";
      layoutType = "single-question";
      primaryColor = "#d97706"; // Warm Amber
      backgroundColor = "#fffbe6";
    } else if (isTech || text.includes("coding") || text.includes("software") || text.includes("javascript") || text.includes("python") || text.includes("react") || text.includes("node")) {
      themeName = "violet-tech";
      layoutType = "floating-grid";
      primaryColor = "#7c3aed"; // Dark Slate & Violet
      backgroundColor = "#faf5ff";
    } else if (plan.domain === 'job' || text.includes("corporate") || text.includes("finance") || text.includes("career")) {
      themeName = "indigo-corporate";
      layoutType = "compact-grid";
      primaryColor = "#3730a3"; // Deep Indigo
      backgroundColor = "#f5f3ff";
    } else if (plan.domain === 'rsvp' || text.includes("wedding") || text.includes("party") || text.includes("event")) {
      themeName = "rose-event";
      layoutType = "single-question";
      primaryColor = "#e11d48"; // Rose Pink
      backgroundColor = "#fff1f2";
    } else if (text.includes("property") || text.includes("estate") || text.includes("travel") || text.includes("car")) {
      themeName = "cyan-realestate";
      layoutType = "compact-grid";
      primaryColor = "#0284c7"; // Ocean Cyan
      backgroundColor = "#f0f9ff";
    }

    return {
      title: formTitle,
      description: `Structured ${formTitle} generated automatically by PromptForm AI.`,
      questions: flatQuestions,
      theme: {
        primary_color: primaryColor,
        background_color: backgroundColor,
        font_family: "Inter",
        rtl: false,
        theme_name: themeName,
        layoutType: layoutType
      },
      settings: {
        collect_emails: !isReview, // Minimize friction for reviews / feedback
        limit_responses: false,
        password: null,
        allow_editing: true,
        shuffle_questions: plan.domain === 'quiz',
        timer_limit: plan.domain === 'quiz' ? 600 : 0,
        anti_cheat_detection: plan.domain === 'quiz'
      },
      layoutConfig: {
        type: layout.type,
        columns: layout.columns
      }
    };
  }
}
