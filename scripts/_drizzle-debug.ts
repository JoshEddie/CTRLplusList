import 'dotenv/config';
import { db } from '../db';
import { lists } from '../db/schema';
import { VISIBILITY } from '../lib/visibility';
const q = db
  .insert(lists)
  .values([
    {
      id: 'x',
      name: 'y',
      occasion: 'z',
      user_id: 'u',
      visibility: VISIBILITY.OWNER,
      shared: false,
      shared_at: null,
    },
  ])
  .toSQL();
console.log(q.sql);
