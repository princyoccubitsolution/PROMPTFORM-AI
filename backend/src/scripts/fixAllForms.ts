import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const validTypes = [
  "short_text", "standard-input", "name", "email", "phone", "website", "amount", "price",
  "password", "long_text", "feedback", "address", "mcq", "one_option", "gender",
  "checkbox", "multiple_options", "dropdown", "country", "agreement", "rating",
  "star-rating", "signature", "file_upload", "file-uploader", "resume", "photo",
  "date", "time", "color", "location", "location-selector", "otp", "payment"
];

function normalizeFieldType(label: string, type: string): string {
  const lowerLabel = (label || "").toLowerCase();
  const lowerType = (type || "").toLowerCase();

  if (validTypes.includes(lowerType)) {
    return lowerType;
  }

  if (lowerType.includes("rating") || lowerType.includes("satisfaction") || lowerType.includes("emoji")) return "rating";
  if (lowerType.includes("slider") || lowerType.includes("range")) return "amount";
  if (lowerType.includes("file") || lowerType.includes("upload") || lowerType.includes("resume")) return "resume";
  if (lowerType.includes("image") || lowerType.includes("photo") || lowerType.includes("pic")) return "photo";
  if (lowerType.includes("datetime") || lowerType.includes("date-time")) return "date";
  if (lowerType.includes("tag") || lowerType.includes("cloud")) return "multiple_options";
  if (lowerType.includes("pain") || lowerType.includes("body")) return "feedback";
  if (lowerType.includes("text") || lowerType.includes("input")) return "name";

  return "name";
}

async function main() {
  console.log("Starting DB sweep to normalize all question types...");
  const questions = await db.question.findMany();
  console.log(`Found ${questions.length} total questions in database.`);

  let updatedCount = 0;
  for (const q of questions) {
    const newType = normalizeFieldType(q.label, q.type);
    if (newType !== q.type) {
      await db.question.update({
        where: { id: q.id },
        data: { type: newType }
      });
      console.log(`Updated question [${q.id}] in Form [${q.formId}]: "${q.label}" (${q.type} -> ${newType})`);
      updatedCount++;
    }
  }

  console.log(`Successfully normalized ${updatedCount} questions in the database!`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
