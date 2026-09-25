import { detectIntent } from '../lib/intentEngine';
import { sanitizeFormTitle } from '../lib/titleSanitizer';

const scenarios = [
  "Create a JavaScript quiz.",
  "Create a 20-question difficult Node.js MCQ.",
  "Create a customer satisfaction survey.",
  "Create a modern travel booking form with destination, travel dates, number of travelers, transport/accommodation preferences, budget, and special requirements. Use smart field types, required validation, conditional questions, and a clean responsive layout with a clear booking confirmation after submission.",
  "Dentistry Patient Intake Form with medical history and insurance details",
  "NPS Customer Survey for restaurant dining experience"
];

console.log("=================== TOPIC & TITLE SANITIZER VERIFICATION ===================\n");

scenarios.forEach((prompt, idx) => {
  console.log(`[Test ${idx + 1}] Prompt: "${prompt}"`);
  const intent = detectIntent(prompt);
  const title = sanitizeFormTitle(prompt, prompt, intent.topic);
  console.log(` -> Detected Topic: "${intent.topic}"`);
  console.log(` -> Generated Title: "${title}"`);
  console.log(` -> Form Type: "${intent.formType}"`);
  console.log(` -> Summary Pill: "${intent.understandingSummary.summaryText}"\n`);
});

console.log("=========================================================================");
