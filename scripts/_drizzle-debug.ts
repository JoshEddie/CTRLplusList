import 'dotenv/config';
import { db } from '../db';
import { lists } from '../db/schema';
const q = db
  .insert(lists)
  .values([
    {
      id: 'x',
      name: 'y',
      occasion: 'z',
      user_id: 'u',
      visibility: 'private',
      shared: false,
      shared_at: null,
    },
  ])
  .toSQL();
console.log(q.sql);
