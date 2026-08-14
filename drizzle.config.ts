import { config } from 'dotenv';
import type { Config } from 'drizzle-kit';

config({ path: ['.env.local', '.env'] });

export default {
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
} satisfies Config;
