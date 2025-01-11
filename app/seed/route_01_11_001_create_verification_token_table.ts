import { db } from '@vercel/postgres';

const client = await db.connect();

async function createVerificationTokenTable() {
  await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await client.sql`
    CREATE TABLE IF NOT EXISTS verification_token (
      identifier VARCHAR(255) NOT NULL,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires TIMESTAMP WITH TIME ZONE NOT NULL,
      PRIMARY KEY (identifier,token)
    );
  `;
}

export async function GET() {
  try {
    await client.sql`BEGIN`;
    await createVerificationTokenTable();
    await client.sql`COMMIT`;

    return Response.json({
      message: 'Verification Table created successfully',
    });
  } catch (error) {
    console.log('Error', error);
    await client.sql`ROLLBACK`;
    return Response.json({ error }, { status: 500 });
  }
}
