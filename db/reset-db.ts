import { Pool } from 'pg';

async function dropTables() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Drop tables in reverse order of dependencies
    await pool.query(`
      DROP TABLE IF EXISTS item_stores CASCADE;
      DROP TABLE IF EXISTS list_items CASCADE;
      DROP TABLE IF EXISTS items CASCADE;
      DROP TABLE IF EXISTS lists CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TYPE IF EXISTS status CASCADE;
      DROP TYPE IF EXISTS priority CASCADE;
    `);

    console.log('All tables and enums have been dropped successfully');
  } catch (error) {
    console.error('Error dropping tables:', error);
    process.exit(1);
  }
}

dropTables();
