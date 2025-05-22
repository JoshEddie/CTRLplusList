import { hash } from 'bcrypt';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { lists, users } from '../db/schema';

async function main() {
  console.log('Starting database seeding...');

  // Clean up existing data
  await db.delete(lists);
  await db.delete(users);

  // Create demo users
  const demoPassword = await hash('password123', 10);

  const adminUserId = nanoid();
  const memberUserId = nanoid();

  const adminUser = await db
    .insert(users)
    .values({
      id: adminUserId,
      name: 'Admin',
      email: 'admin@example.com',
      password: demoPassword,
    })
    .returning()
    .then((rows) => rows[0]);

  const memberUser = await db
    .insert(users)
    .values({
      id: memberUserId,
      name: 'User',
      email: 'user@example.com',
      password: demoPassword,
    })
    .returning()
    .then((rows) => rows[0]);

  console.log('Created demo users:');
  console.log(`- Admin: ${adminUser.email} (password: password123)`);
  console.log(`- User: ${memberUser.email} (password: password123)`);

  // Create demo lists
  const demoLists = [
    {
      name: 'Implement user authentication',
      occasion: 'Birthday',
      date: new Date(),
      user_id: adminUserId,
    },
    {
      name: 'Design landing page',
      occasion: 'Birthday',
      date: new Date(),
      user_id: adminUserId,
    },
    {
      name: 'Add dark mode support',
      occasion: 'Christmas',
      date: new Date(),
      user_id: memberUserId,
    },
    {
      name: 'Create issue management API',
      occasion: 'Anniversary',
      date: new Date(),
      user_id: memberUserId,
    },
    {
      name: 'Implement drag and drop for lists',
      occasion: 'Birthday',
      date: new Date(),
      user_id: adminUserId,
    },
  ];

  for (const list of demoLists) {
    await db.insert(lists).values({
      name: list.name,
      occasion: list.occasion,
      date: list.date,
      user_id: list.user_id,
    });
  }

  console.log(`Created ${demoLists.length} demo lists`);
  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    console.log('Seed script finished');
  });
