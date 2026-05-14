import * as path from 'path';
import * as dotenv from 'dotenv';
import { Client } from 'pg';

// Load .env from the be/ root (this script lives in be/scripts)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const VERIFIED_BASE_URLS: string[] = [
  'https://images.pexels.com/photos/47730/the-ball-stadion-football-the-pitch-47730.jpeg',
  'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg',
  'https://images.pexels.com/photos/186076/pexels-photo-186076.jpeg',
  'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg',
  'https://images.pexels.com/photos/2570139/pexels-photo-2570139.jpeg',
  'https://images.pexels.com/photos/3651597/pexels-photo-3651597.jpeg',
  'https://images.pexels.com/photos/1311518/pexels-photo-1311518.jpeg',
  'https://images.pexels.com/photos/3041176/pexels-photo-3041176.jpeg',
  'https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg',
  'https://images.pexels.com/photos/186230/pexels-photo-186230.jpeg',
  'https://images.pexels.com/photos/114296/pexels-photo-114296.jpeg',
  'https://images.pexels.com/photos/270085/pexels-photo-270085.jpeg',
];

const PEXELS_QUERY = '?auto=compress&cs=tinysrgb&w=1200';

function withQuery(url: string): string {
  return `${url}${PEXELS_QUERY}`;
}

async function main(): Promise<void> {
  if (VERIFIED_BASE_URLS.length !== 12) {
    throw new Error(
      `Expected 12 verified URLs, got ${VERIFIED_BASE_URLS.length}`,
    );
  }

  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await client.connect();
  console.log(
    `Connected to ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT} as ${process.env.DB_USER}`,
  );

  try {
    const fieldsResult = await client.query<{ id: string; name: string }>(
      'SELECT id, name FROM fields ORDER BY created_at ASC',
    );
    const fields = fieldsResult.rows;
    console.log(`Found ${fields.length} fields`);

    let insertedCount = 0;

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];

      const deleteRes = await client.query(
        'DELETE FROM field_images WHERE field_id = $1',
        [field.id],
      );

      const urls: string[] = [
        withQuery(VERIFIED_BASE_URLS[i % 12]),
        withQuery(VERIFIED_BASE_URLS[(i + 1) % 12]),
        withQuery(VERIFIED_BASE_URLS[(i + 2) % 12]),
      ];

      for (let j = 0; j < urls.length; j++) {
        await client.query(
          'INSERT INTO field_images (field_id, image_url, is_primary) VALUES ($1, $2, $3)',
          [field.id, urls[j], j === 0],
        );
        insertedCount++;
      }

      console.log(
        `[${i + 1}/${fields.length}] ${field.name} (${field.id}): deleted ${deleteRes.rowCount ?? 0}, inserted 3`,
      );
    }

    console.log(
      `\nDone. Total images inserted: ${insertedCount} across ${fields.length} fields.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
