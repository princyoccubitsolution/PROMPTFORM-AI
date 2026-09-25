export function sanitizeFormTitle(rawTitle: string, rawPrompt?: string, topic?: string): string {
  // Check for explicit user title commands: "title is X", "change title to X", "title: X", "rename form to X"
  const promptToSearch = rawPrompt || rawTitle || '';
  const explicitMatch = promptToSearch.match(/(?:change title to|rename title to|set title to|title is|title:)\s*["']?([^"'\n\r,]+)["']?/i);
  if (explicitMatch && explicitMatch[1] && explicitMatch[1].trim().length > 1) {
    const explicitTitle = explicitMatch[1].trim();
    if (explicitTitle.length <= 50) {
      return explicitTitle
        .split(/\s+/)
        .map(w => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
        .join(' ');
    }
  }

  let cleaned = (rawTitle || topic || '').trim();
  if (!cleaned) cleaned = 'Custom AI Form';

  // Strip common prompt instruction prefixes and leading articles (a, an, the, modern)
  cleaned = cleaned.replace(/^(a|an|the|create|make|generate|build|please\s+create|please\s+build|please\s+generate)\s+/gi, '');
  cleaned = cleaned.replace(/^(a|an|the)\s+/gi, '');

  // Cut off at common instruction conjunctions: with, using, containing, use, include, including, and, for, having, where, after
  cleaned = cleaned.split(/\b(with|using|use|containing|include|including|having|after|where|for|by|based\s+on)\b/i)[0].trim();

  // Strip UI design words / instructions noise
  cleaned = cleaned.replace(/\b(smart\s+field\s+types|required\s+validation|conditional\s+questions|clean\s+responsive\s+layout|booking\s+confirmation|after\s+submission|net\s+promoter\s+score|nps|rating\s+scales|anti[\s\-]?cheat|timer\s+limit|mcq|mcqs|general|structured|form\s+type)\b/gi, '');

  // Clean trailing and leading punctuation/whitespace
  cleaned = cleaned.replace(/^[\,\.\:\;\-\_\s]+|[\,\.\:\;\-\_\s]+$/g, '').trim();

  // Split into words
  let words = cleaned.split(/\s+/).filter(w => w.length > 0);

  // If title is still too long (> 5 words or > 40 chars), keep only the first 3-4 meaningful words
  if (words.length > 5 || cleaned.length > 40) {
    words = words.slice(0, 4);
    cleaned = words.join(' ');
  }

  // Ensure title ends with a clean form type word if missing
  if (words.length === 0) {
    cleaned = topic ? `${topic} Form` : "Custom AI Form";
  } else {
    const lower = cleaned.toLowerCase();
    if (
      !lower.includes("form") && 
      !lower.includes("quiz") && 
      !lower.includes("survey") && 
      !lower.includes("rsvp") && 
      !lower.includes("application") && 
      !lower.includes("assessment") && 
      !lower.includes("sheet") &&
      !lower.includes("tracker") &&
      !lower.includes("portal")
    ) {
      cleaned = `${cleaned} Form`;
    }
  }

  // Capitalize title words properly and strip any leading articles
  let finalTitle = cleaned
    .split(/\s+/)
    .map(w => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ')
    .trim();

  return finalTitle.replace(/^(A|An|The)\s+/i, '').trim();
}
