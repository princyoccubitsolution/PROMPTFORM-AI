import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log("Starting backfill for missing uniqueShareIds...");
  const forms = await db.form.findMany({
    where: {
      OR: [
        { uniqueShareId: null },
        { publicUrl: null }
      ]
    }
  });

  console.log(`Found ${forms.length} forms needing backfill.`);

  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const frontendBaseUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:4500';

  let count = 0;
  for (const form of forms) {
    let code = '';
    let exists = true;
    while (exists) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const dup = await db.form.findUnique({ where: { uniqueShareId: code } });
      if (!dup) exists = false;
    }
    
    const publicUrl = `${frontendBaseUrl}/f/${code}`;
    
    await db.form.update({
      where: { id: form.id },
      data: {
        uniqueShareId: code,
        publicUrl: publicUrl
      }
    });
    count++;
  }

  console.log(`Backfill completed successfully! Updated ${count} forms.`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
