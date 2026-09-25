import { IFieldMetadata } from './interfaces';

export class FieldDiscovery {
  static discover(domain: string, normalizedPrompt: string, documentContext?: string): IFieldMetadata[] {
    const fields: IFieldMetadata[] = [];
    const text = normalizedPrompt.toLowerCase();

    // Helper to map and resolve correct premium type
    const mapType = (label: string, fallbackType: string): string => {
      if (fallbackType === "mcq" || fallbackType === "checkbox" || fallbackType === "dropdown" || fallbackType === "one_option" || fallbackType === "multiple_options" || fallbackType === "emoji-satisfaction-scale") {
        return fallbackType === "one_option" ? "mcq" : fallbackType;
      }
      const lower = label.toLowerCase();
      if (lower.includes("password")) return "password";
      if (lower.includes("email")) return "email";
      if (lower.includes("phone") || lower.includes("mobile") || lower.includes("contact")) return "phone";
      if (lower.includes("website") || lower.includes("url") || lower.includes("link") || lower.includes("portfolio") || lower.includes("linkedin")) return "website";
      
      if (lower.includes("roll") || lower.includes("enrollment") || lower.includes("student id") || lower.includes("id number") || lower.includes("registration number") || lower.includes("id code")) return "short_text";

      if (lower.includes("dob") || lower.includes("date of birth") || lower.includes("birth date")) return "date";
      if (lower.includes("date") && lower.includes("time")) return "date";
      if (lower.includes("date") && !lower.includes("time")) return "date";
      if (lower.includes("time") && !lower.includes("date")) return "time";
      
      if (lower.includes("color")) return "color";
      if (lower.includes("location") || lower.includes("map") || lower.includes("address")) return "location";
      if (lower.includes("otp") || lower.includes("verification code")) return "otp";
      
      if (lower.includes("salary") || lower.includes("price") || lower.includes("cost") || lower.includes("budget") || lower.includes("amount of payment")) return "price";
      if (lower.includes("age") || lower.includes("quantity") || lower.includes("amount") || lower.includes("credits")) return "amount";
      
      if (lower.includes("slider") || lower.includes("range")) return "amount";
      if (lower.includes("signature") || lower.includes("sign")) return "signature";
      
      if (lower.includes("resume") || lower.includes("cv")) return "resume";
      if (lower.includes("photo") || lower.includes("avatar") || lower.includes("image") || lower.includes("pic")) return "photo";
      
      if (lower.includes("terms") || lower.includes("declaration") || lower.includes("agree") || lower.includes("consent")) return "agreement";
      
      if (lower.includes("satisfaction") || lower.includes("nps") || lower.includes("rating")) {
        return "rating";
      }
      
      if (lower.includes("pain") || lower.includes("body")) return "feedback";
      if (lower.includes("symptom") || lower.includes("tag")) return "multiple_options";
      
      if (lower.includes("description") || lower.includes("feedback") || lower.includes("comment") || lower.includes("query") || lower.includes("message") || lower.includes("history")) return "feedback";
      
      if (lower.includes("gender")) return "gender";
      
      if (lower.includes("name")) return "name";
      
      if (fallbackType === "short_text" || fallbackType === "standard-input") return lower.includes("name") ? "name" : "short_text";
      if (fallbackType === "long_text") return lower.includes("feedback") || lower.includes("comment") ? "feedback" : "long_text";
      if (fallbackType === "file_upload") return lower.includes("resume") || lower.includes("cv") ? "resume" : "file_upload";
      if (fallbackType === "checkbox") return lower.includes("agree") || lower.includes("terms") ? "agreement" : "checkbox";
      
      return fallbackType;
    };

    // Helper to generate options
    const populateOptions = (label: string, type: string, existingOptions?: string[]): string[] => {
      const lower = label.toLowerCase();
      if (existingOptions && existingOptions.length > 0) return existingOptions;
      
      if (type === "gender") {
        return ["Male", "Female", "Non Binary", "Prefer Not To Say"];
      }
      if (type === "country") {
        return ["United States", "United Kingdom", "Canada", "Australia", "India", "Germany", "France", "Japan", "Other"];
      }
      if (type === "agreement") {
        return ["I agree to all terms, conditions, and privacy policies."];
      }
      if (lower.includes("quality") || lower.includes("food") || lower.includes("taste")) {
        return ["Excellent", "Good", "Average", "Poor", "Very Poor"];
      }
      if (lower.includes("experience") || lower.includes("years") || lower.includes("tenure")) {
        return ["0-1 Years", "2-5 Years", "5-10 Years", "10+ Years"];
      }
      if (lower.includes("frequency")) {
        return ["Daily", "Weekly", "Monthly", "Occasionally"];
      }
      if (lower.includes("satisfaction") || lower.includes("rate") || lower.includes("opinion")) {
        return ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"];
      }
      
      if (type === "mcq" || type === "one_option" || type === "checkbox" || type === "multiple_options" || type === "dropdown" || type === "interactive-tag-cloud") {
        return ["Option 1", "Option 2", "Option 3"];
      }
      
      return [];
    };

    // 0. If document text is provided, try to extract questions from it
    if (documentContext) {
      const lines = documentContext.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const extractedFields: IFieldMetadata[] = [];
      
      lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        const isQuestion = line.includes("?") || 
                           /^(?:what|who|how|why|which|where|when|choose|select|enter|please|fill)\b/i.test(line) ||
                           /^\d+[\s.)]/.test(line);
        
        if (isQuestion && line.length > 5 && line.length < 150) {
          let label = line.replace(/^\d+[\s.)]+/, "").trim();
          let type = mapType(label, "name");
          let options = populateOptions(label, type);
          extractedFields.push({ type, label, required: true, options });
        }
      });
      
      if (extractedFields.length > 0) {
        return extractedFields;
      }
    }

    // 1. Try to dynamically parse custom fields from the prompt first
    const parsedFields: IFieldMetadata[] = [];
    const fieldListMatch = text.match(/(?:fields|questions|with|include|contain|need|want|asking for|collect|add|insert|fields of|fields like)\b:?\s*([^.?!]*)/i);
    if (fieldListMatch && fieldListMatch[1]) {
      const listRaw = fieldListMatch[1];
      const items = listRaw.split(/,|\band\b|;|\bor\b/i).map(i => i.replace(/["'\-\*]/g, "").trim()).filter(Boolean);
      if (items.length > 0 && items.length < 25) {
        items.forEach(item => {
          let label = item.charAt(0).toUpperCase() + item.slice(1);
          let type = mapType(label, "name");
          let options = populateOptions(label, type);
          parsedFields.push({ type, label, required: true, options });
        });
      }
    }

    // 2. Core mapping based on domain / category
    if (domain === 'medical' || text.includes("hospital") || text.includes("medical") || text.includes("patient") || text.includes("surgery") || text.includes("doctor")) {
      fields.push(
        { type: "name", label: "Patient Full Name", required: true, options: [] },
        { type: "date", label: "Date of Birth", required: true, options: [] },
        { type: "amount", label: "Age", required: false, options: [], readOnly: true },
        { type: "name", label: "Guardian Name", required: false, options: [] },
        { type: "one_option", label: "Blood Group", required: true, options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
        { type: "one_option", label: "Has Insurance", required: true, options: ["Yes", "No"] },
        { type: "amount", label: "Insurance Number", required: false, options: [] },
        { type: "feedback", label: "Medical History Summary", required: false, options: [] },
        { type: "feedback", label: "Allergies Information", required: false, options: [] },
        { type: "feedback", label: "Current Medication", required: false, options: [] },
        { type: "name", label: "Emergency Contact Name", required: true, options: [] },
        { type: "phone", label: "Emergency Contact Phone", required: true, options: [] },
        { type: "dropdown", label: "Assigned Doctor", required: false, options: ["Dr. Patel", "Dr. Shah", "Dr. Mehta"] },
        { type: "date", label: "Appointment Date", required: true, options: [] },
        { type: "agreement", label: "Consent Agreement Details", required: true, options: ["I agree to all medical terms and treatment conditions"] },
        { type: "signature", label: "Digital Signature Verification", required: true, options: [] },
        { type: "resume", label: "Document Upload (ID / Insurance Card)", required: false, options: [] },
        { type: "body-pain-selector", label: "Select Pain Regions (Visual Pain Map)", required: true, options: [] },
        { type: "interactive-tag-cloud", label: "Choose Accompanying Symptoms", required: true, options: ["Pain", "Fever", "Cough", "Cold", "Fatigue", "Headache"] }
      );
    } else if (text.includes("school") || text.includes("college") || text.includes("admission") || text.includes("clg") || text.includes("education")) {
      fields.push(
        { type: "name", label: "Student Full Name", required: true, options: [] },
        { type: "email", label: "Email Address", required: true, options: [] },
        { type: "date", label: "Date of Birth", required: true, options: [] },
        { type: "gender", label: "Gender", required: true, options: ["Male", "Female", "Non Binary", "Prefer Not To Say"] },
        { type: "address", label: "Residential Address", required: true, options: [] },
        { type: "name", label: "Parent/Guardian Name", required: true, options: [] },
        { type: "phone", label: "Parent Contact Phone Number", required: true, options: [] },
        { type: "dropdown", label: "Preferred Stream / Course", required: true, options: ["Science (A-Group)", "Science (B-Group)", "Commerce", "Arts"] },
        { type: "photo", label: "Passport Size Photograph", required: true, options: [] },
        { type: "resume", label: "Upload Previous Marksheets (PDF)", required: true, options: [] },
        { type: "resume", label: "Upload School Leaving Certificate (LC)", required: true, options: [] },
        { type: "agreement", label: "Declaration Checkbox", required: true, options: ["I declare all information is correct and complete"] }
      );
    } else if (text.includes("tech") || text.includes("science") || text.includes("antigravity") || text.includes("aerospace") || text.includes("engineering") || text.includes("research") || text.includes("lab")) {
      fields.push(
        { type: "name", label: "Researcher Full Name", required: true, options: [] },
        { type: "name", label: "Research Institution / Lab Name", required: true, options: [] },
        { type: "amount", label: "Researcher Credentials ID", required: true, options: [] },
        { type: "name", label: "Measurement Parameter Name", required: true, options: [] },
        { type: "amount", label: "Precision Metric Value", required: true, options: [] },
        { type: "resume", label: "Upload Design Blueprints or Schematics (PDF/ZIP)", required: true, options: [] },
        { type: "multiple_options", label: "Safety Protocols and Compliance Checklist", required: true, options: ["Lab protocols verified", "Dual-use checks passed", "Shielding active"] },
        { type: "signature", label: "Supervisor Signature Verification", required: true, options: [] }
      );
    } else if (domain === 'survey' && (text.includes("restaurant") || text.includes("food") || text.includes("meal") || text.includes("hotel") || text.includes("stay") || text.includes("room"))) {
      fields.push(
        { type: "emoji-satisfaction-scale", label: "Food Quality and Taste Rating", required: true, options: ["🤩", "😋", "😐", "🙁", "🤮"] },
        { type: "emoji-satisfaction-scale", label: "Service Speed & Attentiveness", required: true, options: ["🤩", "😋", "😐", "🙁", "🤮"] },
        { type: "emoji-satisfaction-scale", label: "Ambiance & Cleanliness Rating", required: true, options: ["🤩", "😋", "😐", "🙁", "🤮"] },
        { type: "one_option", label: "Dining Frequency", required: true, options: ["First Time", "Weekly", "Monthly", "Occasionally"] },
        { type: "feedback", label: "Detailed Feedback & Experience Details", required: false, options: [] },
        { type: "agreement", label: "Recommend to friends & family?", required: true, options: ["Yes, absolutely"] }
      );
    } else if (domain === 'job' || text.includes("job") || text.includes("career") || text.includes("hiring") || text.includes("apply") || text.includes("work")) {
      fields.push(
        { type: "name", label: "Full Name", required: true, options: [] },
        { type: "email", label: "Email Address", required: true, options: [] },
        { type: "phone", label: "Phone Number", required: true, options: [] },
        { type: "gender", label: "Gender", required: true, options: ["Male", "Female", "Non Binary", "Prefer Not To Say"] },
        { type: "resume", label: "Resume Upload", required: true, options: [] },
        { type: "feedback", label: "Education Details", required: true, options: [] },
        { type: "feedback", label: "Work Experience Details", required: true, options: [] },
        { type: "interactive-tag-cloud", label: "Professional Skills", required: true, options: ["React", "Node.js", "Python", "TypeScript", "SQL", "HTML/CSS", "UX Design"] },
        { type: "website", label: "LinkedIn Profile URL", required: false, options: [] },
        { type: "website", label: "Portfolio URL", required: false, options: [] },
        { type: "price", label: "Expected Salary (USD)", required: true, options: [] },
        { type: "date-time-picker", label: "Availability Date & Time", required: true, options: [] },
        { type: "agreement", label: "Declaration Consent", required: true, options: ["I declare all information is correct and true"] }
      );
    } else if (domain === 'quiz' || text.includes("quiz") || text.includes("exam") || text.includes("test") || text.includes("mcq")) {
      if (text.includes("student") || text.includes("roll") || text.includes("candidate name") || text.includes("student name")) {
        fields.push(
          { type: "name", label: "Student Full Name", required: true, options: [] },
          { type: "amount", label: "Student Roll / ID Number", required: true, options: [] }
        );
      }

      if (text.includes("js") || text.includes("javascript")) {
        fields.push(
          { type: "mcq", label: "Q1: What is the output of typeof null in JavaScript?", required: true, options: ["object", "null", "undefined", "number"] },
          { type: "mcq", label: "Q2: Which keyword is used to declare a block-scoped variable in ES6?", required: true, options: ["let", "var", "global", "def"] },
          { type: "mcq", label: "Q3: Which method parses a JSON string into a JavaScript object?", required: true, options: ["JSON.parse()", "JSON.stringify()", "JSON.toObject()", "JSON.decode()"] },
          { type: "mcq", label: "Q4: Which built-in array method creates a new array with all elements that pass a test?", required: true, options: ["filter()", "map()", "forEach()", "reduce()"] },
          { type: "mcq", label: "Q5: What is the purpose of Promise.all() in JavaScript?", required: true, options: ["Executes multiple promises concurrently and resolves when all succeed", "Executes promises sequentially", "Cancels pending promises", "Catches all unhandled errors"] }
        );
      } else if (text.includes("node")) {
        fields.push(
          { type: "mcq", label: "Q1: Which core Node.js module is used to handle file system operations?", required: true, options: ["fs", "path", "http", "stream"] },
          { type: "mcq", label: "Q2: What mechanism in Node.js handles non-blocking asynchronous I/O?", required: true, options: ["Event Loop & Libuv", "Multi-threading kernel", "Synchronous worker pool", "Child process fork"] },
          { type: "mcq", label: "Q3: Which function is used to load CommonJS modules in Node.js?", required: true, options: ["require()", "import()", "include()", "load()"] },
          { type: "mcq", label: "Q4: What is the default file name for project dependencies & metadata in Node.js?", required: true, options: ["package.json", "node_modules.json", "config.xml", "server.js"] },
          { type: "mcq", label: "Q5: Which event listener catches unhandled promise rejections in process?", required: true, options: ["unhandledRejection", "uncaughtException", "promiseError", "asyncError"] }
        );
      } else if (text.includes("python")) {
        fields.push(
          { type: "mcq", label: "Q1: What is the correct syntax to print 'Hello' in Python 3?", required: true, options: ["print('Hello')", "echo 'Hello'", "console.log('Hello')", "System.out.println('Hello')"] },
          { type: "mcq", label: "Q2: Which data structure in Python is immutable?", required: true, options: ["Tuple", "List", "Dictionary", "Set"] },
          { type: "mcq", label: "Q3: Which keyword is used to define a function in Python?", required: true, options: ["def", "function", "fn", "define"] },
          { type: "mcq", label: "Q4: What does list comprehension [x*2 for x in range(3)] output?", required: true, options: ["[0, 2, 4]", "[2, 4, 6]", "[0, 1, 2]", "[1, 2, 3]"] },
          { type: "mcq", label: "Q5: Which standard module provides regular expression matching in Python?", required: true, options: ["re", "regex", "pyregex", "string"] }
        );
      } else if (text.includes("react")) {
        fields.push(
          { type: "mcq", label: "Q1: Which React hook is used to manage local component state?", required: true, options: ["useState", "useEffect", "useContext", "useReducer"] },
          { type: "mcq", label: "Q2: What hook is used to perform side effects in functional components?", required: true, options: ["useEffect", "useState", "useMemo", "useCallback"] },
          { type: "mcq", label: "Q3: What is the primary purpose of the Virtual DOM in React?", required: true, options: ["Minimizes real DOM manipulations for fast rendering", "Directly mutates browser HTML", "Handles database queries", "Compiles code to WebAssembly"] },
          { type: "mcq", label: "Q4: How are read-only attributes passed down from parent to child components?", required: true, options: ["Props", "State", "Redux Dispatch", "LocalStorage"] },
          { type: "mcq", label: "Q5: Which key attribute helps React identify which items have changed in a list?", required: true, options: ["key", "id", "index", "ref"] }
        );
      } else if (text.includes("sql") || text.includes("database")) {
        fields.push(
          { type: "mcq", label: "Q1: Which SQL clause is used to filter records after aggregation with GROUP BY?", required: true, options: ["HAVING", "WHERE", "ORDER BY", "FILTER"] },
          { type: "mcq", label: "Q2: Which constraint uniquely identifies each record in a relational table?", required: true, options: ["PRIMARY KEY", "FOREIGN KEY", "UNIQUE KEY", "CHECK"] },
          { type: "mcq", label: "Q3: Which JOIN returns all records when there is a match in left or right table?", required: true, options: ["FULL OUTER JOIN", "INNER JOIN", "LEFT JOIN", "CROSS JOIN"] },
          { type: "mcq", label: "Q4: What SQL command quickly empties a table without logging individual row deletions?", required: true, options: ["TRUNCATE TABLE", "DELETE FROM", "DROP TABLE", "REMOVE ALL"] }
        );
      } else if (text.includes("gta v") || text.includes("gta 5") || text.includes("grand theft auto") || text.includes("gta")) {
        fields.push(
          { type: "mcq", label: "Q1: Who are the three main playable protagonists in GTA V?", required: true, options: ["Michael, Franklin, Trevor", "Niko, CJ, Tommy", "Claude, Lester, Lamar", "Arthur, John, Dutch"], correctAnswer: "Michael, Franklin, Trevor", explanation: "Michael De Santa, Franklin Clinton, and Trevor Philips are the three main protagonists." },
          { type: "mcq", label: "Q2: What is the name of the fictional state where GTA V takes place?", required: true, options: ["San Andreas", "Vice City", "Liberty City", "San Fierro"], correctAnswer: "San Andreas", explanation: "GTA V is set in the fictional state of San Andreas, based on Southern California." },
          { type: "mcq", label: "Q3: What major heist is the first planned robbery executed by Michael and Franklin?", required: true, options: ["The Jewel Store Job", "The Paleto Score", "The Pacific Standard Job", "The Bureau Raid"], correctAnswer: "The Jewel Store Job", explanation: "The Jewel Store Job is the first major heist in story mode." },
          { type: "mcq", label: "Q4: Which technology company in GTA V parodies Apple?", required: true, options: ["iFruit", "Lifeinvader", "Whiz", "Facade"], correctAnswer: "iFruit", explanation: "iFruit is the parody of Apple in GTA V." },
          { type: "mcq", label: "Q5: What is Lester Crest's primary role in planning heists?", required: true, options: ["The Brains & Master Planner", "The Getaway Driver", "The Demolitionist", "The Weapons Expert"], correctAnswer: "The Brains & Master Planner", explanation: "Lester plans the logistics and targets for main heists." }
        );
      } else if (text.includes("cricket")) {
        fields.push(
          { type: "mcq", label: "Q1: How many players are on the field for one team in a cricket match?", required: true, options: ["11 Players", "10 Players", "12 Players", "9 Players"], correctAnswer: "11 Players" },
          { type: "mcq", label: "Q2: What is the maximum number of overs per innings in a T20 match?", required: true, options: ["20 Overs", "50 Overs", "10 Overs", "15 Overs"], correctAnswer: "20 Overs" },
          { type: "mcq", label: "Q3: Which country won the inaugural ICC Men's T20 World Cup in 2007?", required: true, options: ["India", "Pakistan", "Australia", "West Indies"], correctAnswer: "India" }
        );
      } else {
        let topicClean = text
          .replace(/\b(\d+[\s\-]question|\d+|\d+\-question|create|make|generate|build|form|survey|quiz|test|exam|created|built|please|for|a|an|the|around|questions|form type|feedback|intake|application|rsvp|medical|with|net promoter score|net|promoter|score|rating|ratings|scale|scales|and|or|set|minutes|timer|anti[\s\-]?cheat|add|marks|options|exact|correct|answers|this|id|number|field|remove|option|layout|inline|horizontal)\b/gi, "")
          .replace(/\([^)]*\)/g, "")
          .replace(/[^\w\s]/gi, " ")
          .replace(/\s+/g, " ")
          .trim();
        const words = topicClean.split(/\s+/).filter(w => w.length > 1 && !["this", "id", "remove", "field", "option", "layout", "horizontal", "inline"].includes(w.toLowerCase()));
        const displayTopic = words.length > 0 && words.length <= 3 ? words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : "General Knowledge";

        fields.push(
          { type: "mcq", label: `Q1: Which core concept is essential to ${displayTopic}?`, required: true, options: ["Core Principle A", "Standard Concept B", "Advanced Practice C", "Experimental Option D"] },
          { type: "mcq", label: `Q2: What is the main objective when evaluating ${displayTopic}?`, required: true, options: ["Maximizing Accuracy & Performance", "Bypassing Key Rules", "Increasing System Delay", "Manual Override"] },
          { type: "mcq", label: `Q3: Which methodology represents best practice for ${displayTopic}?`, required: true, options: ["Structured Continuous Verification", "Unchecked Random Changes", "Hardcoded Fallbacks", "Ignoring Guidelines"] },
          { type: "mcq", label: `Q4: How should key requirements be handled in ${displayTopic}?`, required: true, options: ["Explicit Validation & Systematic Checking", "Silent Suppression", "Ignoring Warnings", "Unvalidated Execution"] }
        );
      }
    } else if (domain === 'rsvp' || text.includes("rsvp") || text.includes("event") || text.includes("wedding")) {
      fields.push(
        { type: "name", label: "Guest Full Name", required: true, options: [] },
        { type: "email", label: "Email Address", required: true, options: [] },
        { type: "one_option", label: "Attendance Confirmation", required: true, options: ["Attending", "Not Attending", "Maybe"] },
        { type: "amount", label: "Number of Guests", required: false, options: [] },
        { type: "multiple_options", label: "Dietary Restrictions", required: false, options: ["Vegetarian", "Vegan", "Gluten-Free", "None"] },
        { type: "one_option", label: "Need Parking Assistance?", required: true, options: ["Yes", "No"] },
        { type: "feedback", label: "Special Requests / Message for Host", required: false, options: [] }
      );
    } else if (text.includes("complaint") || text.includes("society") || text.includes("issue")) {
      fields.push(
        { type: "name", label: "Resident Name", required: true, options: [] },
        { type: "name", label: "Wing & Flat Number", required: true, options: [] },
        { type: "phone", label: "Contact Mobile Phone", required: true, options: [] },
        { type: "one_option", label: "Complaint Category", required: true, options: ["Plumbing", "Electrical", "Security", "Cleanliness", "Other"] },
        { type: "feedback", label: "Description of the Issue", required: true, options: [] },
        { type: "one_option", label: "Priority Level", required: true, options: ["Low", "Medium", "High"] },
        { type: "photo", label: "Upload Photo of the Defect/Issue", required: false, options: [] }
      );
    } else if (text.includes("invoice") || text.includes("bill") || text.includes("payment")) {
      fields.push(
        { type: "name", label: "Billing Company Name", required: true, options: [] },
        { type: "name", label: "Item / Service Description", required: true, options: [] },
        { type: "price", label: "Unit Price ($)", required: true, options: [] },
        { type: "amount", label: "Quantity", required: true, options: [] },
        { type: "amount", label: "Tax Rate (%)", required: false, options: [] },
        { type: "email", label: "Billing Email", required: true, options: [] },
        { type: "multiple_options", label: "Payment Method Preferred", required: true, options: ["Credit Card", "Bank Transfer", "PayPal"] }
      );
    } else if (text.includes("gym") || text.includes("workout") || text.includes("fitness") || text.includes("exercise") || text.includes("trainer")) {
      fields.push(
        { type: "name", label: "Client Full Name", required: true, options: [] },
        { type: "email", label: "Email Address", required: true, options: [] },
        { type: "phone", label: "Phone Number", required: true, options: [] },
        { type: "amount", label: "Weight (kg)", required: false, options: [] },
        { type: "amount", label: "Height (cm)", required: false, options: [] },
        { type: "one_option", label: "Primary Fitness Goal", required: true, options: ["Lose Weight", "Gain Muscle", "Improve Endurance", "General Fitness"] },
        { type: "one_option", label: "Preferred Workout Frequency", required: true, options: ["1-2 times a week", "3-4 times a week", "5+ times a week"] },
        { type: "multiple_options", label: "Medical History / Conditions", required: false, options: ["Heart Condition", "High Blood Pressure", "Joint Pain", "Asthma", "None"] },
        { type: "one_option", label: "Trainer Preference", required: true, options: ["Male Trainer", "Female Trainer", "No Preference"] },
        { type: "signature", label: "Liability Waiver Digital Signature", required: true, options: [] }
      );
    } else if (text.includes("travel") || text.includes("flight") || text.includes("trip") || text.includes("tour") || text.includes("tourism") || text.includes("vacation")) {
      fields.push(
        { type: "name", label: "Traveler Full Name", required: true, options: [] },
        { type: "email", label: "Email Address", required: true, options: [] },
        { type: "phone", label: "Contact Phone Number", required: true, options: [] },
        { type: "name", label: "Departure City / Origin", required: true, options: [] },
        { type: "name", label: "Destination City / Country", required: true, options: [] },
        { type: "date", label: "Preferred Departure Date", required: true, options: [] },
        { type: "date", label: "Preferred Return Date", required: false, options: [] },
        { type: "amount", label: "Number of Travelers (Adults/Children)", required: true, options: [] },
        { type: "one_option", label: "Preferred Travel Class", required: true, options: ["Economy Class", "Premium Economy", "Business Class", "First Class"] },
        { type: "photo", label: "Upload Passport Copy (Photo/Image)", required: false, options: [] },
        { type: "feedback", label: "Special Requests (Dietary/Access/Seating)", required: false, options: [] }
      );
    } else if ((text.includes("hotel") || text.includes("room") || text.includes("booking") || text.includes("stay") || text.includes("reservation")) && !text.includes("travel") && !text.includes("flight") && !text.includes("trip")) {
      fields.push(
        { type: "name", label: "Guest Full Name", required: true, options: [] },
        { type: "email", label: "Email Address", required: true, options: [] },
        { type: "phone", label: "Contact Phone Number", required: true, options: [] },
        { type: "date", label: "Check-in Date", required: true, options: [] },
        { type: "date", label: "Check-out Date", required: true, options: [] },
        { type: "one_option", label: "Room Type Preferred", required: true, options: ["Single Room", "Double Room", "Deluxe Suite", "Executive Suite"] },
        { type: "amount", label: "Number of Adults", required: true, options: [] },
        { type: "amount", label: "Number of Children", required: false, options: [] },
        { type: "feedback", label: "Special Dietary / Access Requests", required: false, options: [] }
      );
    } else if (text.includes("car") || text.includes("rent") || text.includes("vehicle")) {
      fields.push(
        { type: "name", label: "Driver Full Name", required: true, options: [] },
        { type: "email", label: "Email Address", required: true, options: [] },
        { type: "amount", label: "Driver's License ID Number", required: true, options: [] },
        { type: "resume", label: "Upload Driver's License Copy (PDF/Image)", required: true, options: [] },
        { type: "date-time-picker", label: "Rental Pickup Date & Time", required: true, options: [] },
        { type: "date-time-picker", label: "Rental Return Date & Time", required: true, options: [] },
        { type: "one_option", label: "Vehicle Class Selected", required: true, options: ["Economy", "Sedan", "SUV", "Luxury Sport", "Electric (EV)"] },
        { type: "multiple_options", label: "Add-on Features Requested", required: false, options: ["GPS Navigator", "Child Safety Seat", "Additional Driver", "Collision Damage Waiver"] }
      );
    } else if (text.includes("property") || text.includes("real estate") || text.includes("house") || text.includes("estate") || text.includes("apartment") || text.includes("land")) {
      fields.push(
        { type: "name", label: "Client Full Name", required: true, options: [] },
        { type: "email", label: "Email Address", required: true, options: [] },
        { type: "phone", label: "Phone Number", required: true, options: [] },
        { type: "one_option", label: "Property Type Interest", required: true, options: ["Apartment / Flat", "Independent House / Villa", "Commercial Space", "Agricultural Land"] },
        { type: "one_option", label: "Intended Action Type", required: true, options: ["Want to Buy", "Want to Rent / Lease", "Want to Sell"] },
        { type: "one_option", label: "Budget Range Category", required: true, options: ["Under $100k", "$100k - $250k", "$250k - $500k", "$500k+"] },
        { type: "location", label: "Preferred Location / City Area", required: true, options: [] },
        { type: "feedback", label: "Specific Requirement Description Cues", required: false, options: [] }
      );
    } else if (text.includes("order") || text.includes("purchase") || text.includes("shop") || text.includes("buy") || text.includes("product")) {
      fields.push(
        { type: "name", label: "Buyer Full Name", required: true, options: [] },
        { type: "email", label: "Email Address", required: true, options: [] },
        { type: "address", label: "Shipping Delivery Address", required: true, options: [] },
        { type: "one_option", label: "Product Category Selection", required: true, options: ["Electronics", "Apparel & Clothing", "Home Appliances", "Books / Stationary"] },
        { type: "name", label: "Item SKU Code / Description", required: true, options: [] },
        { type: "amount", label: "Quantity Selected", required: true, options: [] },
        { type: "one_option", label: "Preferred Payment Channel", required: true, options: ["Credit / Debit Card", "Net Banking", "Cash on Delivery (COD)", "UPI / Wallet"] }
      );
    } else if (text.includes("bug") || text.includes("error") || text.includes("support") || text.includes("ticket") || text.includes("crash")) {
      fields.push(
        { type: "name", label: "Reporter Full Name", required: true, options: [] },
        { type: "email", label: "Reporter Email Address", required: true, options: [] },
        { type: "one_option", label: "Operating System / Platform", required: true, options: ["Windows OS", "macOS", "Linux", "Android Mobile", "iOS Mobile"] },
        { type: "one_option", label: "Ticket Severity Level", required: true, options: ["Low (Usability)", "Medium (Functional bug)", "High (Blocker)", "Critical (Security/Crash)"] },
        { type: "name", label: "One-sentence Issue Summary", required: true, options: [] },
        { type: "feedback", label: "Detailed Steps to Reproduce the Issue", required: true, options: [] },
        { type: "photo", label: "Upload Screenshot of Error/Log", required: false, options: [] }
      );
    } else if (text.includes("donate") || text.includes("donation") || text.includes("charity") || text.includes("fundraise")) {
      fields.push(
        { type: "name", label: "Donor Full Name", required: true, options: [] },
        { type: "email", label: "Donor Email Address", required: true, options: [] },
        { type: "price", label: "Donation Amount Tier", required: true, options: ["$10 USD", "$50 USD", "$100 USD", "$500 USD", "Custom Amount"] },
        { type: "one_option", label: "Donation Frequency Type", required: true, options: ["One-Time Donation", "Monthly Recurring Contribution", "Annual Giving Plan"] },
        { type: "one_option", label: "Fund Allocation Preference", required: true, options: ["Healthcare Programs", "Children Education Support", "Disaster Relief Operations", "General Operations"] },
        { type: "agreement", label: "Request Tax Exemption Receipt", required: true, options: ["Yes, send tax invoice receipt"] }
      );
    } else if (text.includes("course") || text.includes("seminar") || text.includes("webinar") || text.includes("workshop") || text.includes("class")) {
      fields.push(
        { type: "name", label: "Participant Full Name", required: true, options: [] },
        { type: "email", label: "Participant Email Address", required: true, options: [] },
        { type: "name", label: "Current Profession / Job Title", required: true, options: [] },
        { type: "one_option", label: "Course / Workshop Title Selected", required: true, options: ["Introduction to AI & Prompting", "Advanced React & Next.js", "UX/UI Design Thinking", "Cybersecurity Essentials"] },
        { type: "one_option", label: "Prior Knowledge Domain Level", required: true, options: ["Complete Beginner", "Intermediate Level", "Advanced Practitioner"] },
        { type: "one_option", label: "How did you hear about our program?", required: false, options: ["Social Media", "Search Engine", "Email Newsletter", "Friend Referral"] },
        { type: "agreement", label: "Accept Terms and Attendance Waiver", required: true, options: ["I agree to all attendance terms and privacy policies"] }
      );
    } else if (text.includes("login") || text.includes("sign in") || text.includes("log in") || text.includes("signin")) {
      fields.push(
        { type: "email", label: "Email Address", required: true, options: [] },
        { type: "password", label: "Password", required: true, options: [] },
        { type: "agreement", label: "Remember me on this device", required: false, options: ["Keep me signed in"] }
      );
    } else if (text.includes("sign up") || text.includes("signup") || text.includes("register account")) {
      fields.push(
        { type: "name", label: "Full Name", required: true, options: [] },
        { type: "email", label: "Email Address", required: true, options: [] },
        { type: "password", label: "Create Password", required: true, options: [] },
        { type: "agreement", label: "Accept Terms & Conditions", required: true, options: ["I agree to Terms of Service and Privacy Policy"] }
      );
    } else if (text.includes("leave") || text.includes("vacation leave") || text.includes("time off")) {
      fields.push(
        { type: "name", label: "Employee Name", required: true, options: [] },
        { type: "email", label: "Work Email Address", required: true, options: [] },
        { type: "one_option", label: "Leave Type", required: true, options: ["Casual Leave", "Sick Leave", "Earned Leave", "Maternity / Paternity Leave"] },
        { type: "date", label: "Leave Start Date", required: true, options: [] },
        { type: "date", label: "Leave End Date", required: true, options: [] },
        { type: "feedback", label: "Reason for Leave Request", required: true, options: [] }
      );
    } else if (text.includes("newsletter") || text.includes("subscribe")) {
      fields.push(
        { type: "email", label: "Email Address", required: true, options: [] },
        { type: "one_option", label: "Subscription Frequency Preference", required: false, options: ["Weekly Newsletter", "Monthly Digest", "Product & Feature Announcements"] }
      );
    } else if (text.includes("feature request") || text.includes("feature proposal")) {
      fields.push(
        { type: "name", label: "Requester Full Name", required: true, options: [] },
        { type: "email", label: "Work Email Address", required: true, options: [] },
        { type: "one_option", label: "Feature Category", required: true, options: ["UI / UX Improvement", "Integrations", "Performance & Speed", "Security & Compliance"] },
        { type: "feedback", label: "Detailed Feature Description & Use Case", required: true, options: [] }
      );
    } else if (text.includes("vendor") || text.includes("supplier")) {
      fields.push(
        { type: "name", label: "Vendor / Company Name", required: true, options: [] },
        { type: "email", label: "Business Contact Email", required: true, options: [] },
        { type: "phone", label: "Contact Phone Number", required: true, options: [] },
        { type: "one_option", label: "Services / Products Supplied", required: true, options: ["Raw Materials", "IT & Software Services", "Logistics & Freight", "Catering & Facilities"] },
        { type: "resume", label: "Upload W-9 / Tax Certificate (PDF)", required: true, options: [] }
      );
    } else if (text.includes("onboarding") || text.includes("employee onboarding")) {
      fields.push(
        { type: "name", label: "Employee Full Name", required: true, options: [] },
        { type: "date", label: "Date of Birth", required: true, options: [] },
        { type: "phone", label: "Personal Mobile Number", required: true, options: [] },
        { type: "address", label: "Residential Address", required: true, options: [] },
        { type: "photo", label: "Upload Employee Profile Photo", required: true, options: [] },
        { type: "resume", label: "Upload Government Photo ID (PDF/Image)", required: true, options: [] },
        { type: "name", label: "Emergency Contact Person", required: true, options: [] },
        { type: "phone", label: "Emergency Contact Phone Number", required: true, options: [] }
      );
    } else if (text.includes("reservation") || text.includes("table reservation")) {
      fields.push(
        { type: "name", label: "Guest Full Name", required: true, options: [] },
        { type: "email", label: "Email Address", required: true, options: [] },
        { type: "phone", label: "Contact Phone Number", required: true, options: [] },
        { type: "date", label: "Reservation Date", required: true, options: [] },
        { type: "time", label: "Reservation Time Slot", required: true, options: [] },
        { type: "amount", label: "Number of Guests / Party Size", required: true, options: [] },
        { type: "one_option", label: "Seating Preference", required: false, options: ["Main Dining Room", "Outdoor Terrace", "Private Booth", "Bar Area"] }
      );
    } else if (text.includes("appointment") || text.includes("clinic") || text.includes("consultation")) {
      fields.push(
        { type: "name", label: "Patient / Client Full Name", required: true, options: [] },
        { type: "phone", label: "Contact Phone Number", required: true, options: [] },
        { type: "dropdown", label: "Specialist / Service Required", required: true, options: ["General Consultation", "Specialist Review", "Diagnostic Test", "Routine Checkup"] },
        { type: "date", label: "Preferred Appointment Date", required: true, options: [] },
        { type: "time", label: "Preferred Time Slot", required: true, options: [] },
        { type: "feedback", label: "Notes or Symptoms Description", required: false, options: [] }
      );
    } else if (text.includes("product review") || text.includes("service review")) {
      fields.push(
        { type: "name", label: "Reviewer Name", required: true, options: [] },
        { type: "email", label: "Email Address", required: true, options: [] },
        { type: "rating", label: "Product / Service Quality Rating", required: true, options: [] },
        { type: "one_option", label: "Would you recommend this to a friend?", required: true, options: ["Yes, highly recommend", "Maybe", "No"] },
        { type: "feedback", label: "Detailed Product Review", required: true, options: [] }
      );
    } else if (domain === 'survey' || text.includes("review") || text.includes("feedback")) {
      fields.push(
        { type: "emoji-satisfaction-scale", label: "Overall Satisfaction Rating", required: true, options: ["🤩", "😋", "😐", "🙁", "🤮"] },
        { type: "one_option", label: "Product Usage Frequency", required: true, options: ["Daily", "Weekly", "Monthly", "Rarely"] },
        { type: "one_option", label: "How likely are you to purchase from us again?", required: true, options: ["Very Likely", "Somewhat Likely", "Neutral", "Unlikely"] },
        { type: "feedback", label: "Please share detailed feedback details:", required: false, options: [] }
      );
    } else {
      if (parsedFields.length > 2) {
        fields.push(...parsedFields);
      } else {
        fields.push(
          { type: "name", label: "Full Name", required: true, options: [] },
          { type: "email", label: "Email Address", required: true, options: [] },
          { type: "phone", label: "Phone Number", required: false, options: [] },
          { type: "emoji-satisfaction-scale", label: "Overall Satisfaction Rating", required: true, options: ["🤩", "😋", "😐", "🙁", "🤮"] },
          { type: "feedback", label: "Comments or Suggestions", required: false, options: [] }
        );
      }
    }

    return fields.map(f => {
      const finalType = mapType(f.label, f.type);
      return {
        ...f,
        type: finalType,
        options: populateOptions(f.label, finalType, f.options)
      };
    });
  }
}
