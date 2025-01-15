//https://chatgpt.com/g/g-p-67689b8838f48191aa1eb0a51dde9c47-nextjs-tutorial/c/678199cf-b07c-8012-a88a-7b982ede70b4

import { db } from '@vercel/postgres';
import { GET as first } from './route_01_09_initial_seed';
import { GET as second } from './route_01_10_create_sessions_table';
import { GET as third } from './route_01_11_001_create_verification_token_table';
import { GET as fourth } from './route_01_14_create_otp_codes';
const client = await db.connect();

export async function GET() {
  try {
    await client.sql`BEGIN`;
    await first();
    await second();
    await third();
    await fourth();
    await client.sql`COMMIT`;

    return Response.json({ message: 'Database migration success' });
  } catch (error) {
    await client.sql`ROLLBACK`;
    return Response.json({ error }, { status: 500 });
  }
}
