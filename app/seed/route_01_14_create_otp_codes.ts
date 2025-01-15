import { db } from '@vercel/postgres';

const client = await db.connect();

async function createOTPCodesTable() {
  await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await client.sql`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      email TEXT NOT NULL,
      code VARCHAR(6) UNIQUE NOT NULL,
      expires TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `;
}

export async function GET() {
  try {
    await client.sql`BEGIN`;
    await createOTPCodesTable();
    await client.sql`COMMIT`;

    return Response.json({
      message: 'OTP Codes Table created successfully',
    });
  } catch (error) {
    console.log('Error', error);
    await client.sql`ROLLBACK`;
    return Response.json({ error }, { status: 500 });
  }
}
