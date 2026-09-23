import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  const forms = await db.form.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 1,
    include: { questions: { orderBy: { orderIndex: 'asc' } } }
  });
  console.log("LAST UPDATED FORM:", JSON.stringify(forms[0], null, 2));
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
