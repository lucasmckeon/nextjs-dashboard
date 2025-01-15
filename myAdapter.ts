// myAdapter.ts
import { type Adapter } from 'next-auth/adapters';
import { sql } from '@vercel/postgres';
import { randomUUID } from 'crypto';

import type { AdapterUser, VerificationToken } from 'next-auth/adapters';

export const myAdapter: Adapter = {
  // createUser that is used during magic link sign up
  async createUser(user) {
    // Insert a user row in your `users` table
    const id = randomUUID();
    await sql`
      INSERT INTO users (id, email, name, image, email_verified)
      VALUES (${id}, ${user.email}, ${user.name ?? null}, 
      ${user.image ?? null}, ${user.emailVerified?.toISOString() ?? null})
    `;
    // Return the user data with the newly created `id`
    return { ...user, id };
  },

  async getUser(id) {
    const { rows } = await sql`
      SELECT * FROM users WHERE id=${id} LIMIT 1
    `;
    if (!rows.length) return null;
    return rows[0] as AdapterUser;
  },

  async getUserByEmail(email) {
    const { rows } = await sql`
      SELECT * FROM users WHERE email=${email} LIMIT 1
    `;
    if (!rows.length) {
      return null;
    }
    return rows[0] as AdapterUser;
  },

  async getUserByAccount({ provider, providerAccountId }) {
    // For OAuth logins, you'd typically have an `accounts` table with (provider, providerAccountId, userId).
    // If you only do credentials, you can return null or implement if needed.
    return null;
  },

  //Only used for updating email_verified during magic link sign in for now
  async updateUser(user) {
    // Update user in DB if needed
    if (!user.id || !user.emailVerified)
      throw new Error('Cannot update user without an ID');
    await sql`
      UPDATE users
      SET
        email_verified = ${user.emailVerified !== null}
      WHERE id = ${user.id}
    `;
    return user as AdapterUser;
  },

  async deleteUser(userId) {
    await sql`
      DELETE FROM users WHERE id=${userId}
    `;
  },

  async linkAccount(account) {
    // Only needed for OAuth providers
  },

  async unlinkAccount({ provider, providerAccountId }) {
    // Only needed for OAuth providers
  },

  // -- 2) SESSION methods -----------------------------------------
  // async createSession({
  //   sessionToken,
  //   userId,
  //   expires,
  // }: {
  //   sessionToken: string;
  //   userId: string;
  //   expires: Date;
  // }) {
  //   const expiresISO = expires.toISOString();
  //   try {
  //     sql`BEGIN`;
  //     const userExist = await userExists(userId);
  //     if (!userExist) {
  //       throw new Error(
  //         `Session Creation Failed: User with id ${userId} doesn't exist.`
  //       );
  //     }
  //     await sql`
  //         INSERT INTO sessions (session_token, user_id, expires)
  //         VALUES (${sessionToken}, ${userId}, ${expiresISO});
  //       `;
  //     sql`COMMIT`;
  //     return { sessionToken, userId, expires };
  //   } catch (error) {
  //     console.error('Failed to create session', error);
  //     await sql`ROLLBACK`;
  //     throw error;
  //   }
  // }

  //TODO implement with transactions
  async createSession({ sessionToken, userId, expires }) {
    await sql`
      INSERT INTO sessions (session_token, user_id, expires)
      VALUES (${sessionToken}, ${userId}, ${expires.toISOString()})
    `;
    return { sessionToken, userId, expires };
  },

  async getSessionAndUser(sessionToken) {
    // 1) Lookup session row
    const sessionResult = await sql`
      SELECT * FROM sessions
      WHERE session_token=${sessionToken}
      LIMIT 1
    `;
    if (!sessionResult.rows.length) return null;

    // Re-map to NextAuth’s expected shape
    const session = {
      sessionToken: sessionResult.rows[0].session_token,
      userId: sessionResult.rows[0].user_id,
      expires: new Date(sessionResult.rows[0].expires),
    };

    // 2) Lookup user row
    const userResult = await sql`
      SELECT * FROM users
      WHERE id=${session.userId}
      LIMIT 1
    `;
    if (!userResult.rows.length) return null;

    const user = userResult.rows[0] as AdapterUser;

    return { user, session };
  },

  async updateSession({ sessionToken, userId, expires }) {
    console.log('UPDATE SESSION');
    if (!sessionToken || !userId || !expires) {
      console.warn('UPDATE SESSION NOT RUN');
      //Return instead of throwing an error to support expire times besides default 30 days
      return;
    }
    const result = await sql`
      UPDATE sessions
      SET 
        user_id=${userId},
        expires=${expires.toISOString()}
      WHERE session_token=${sessionToken}
      RETURNING session_token, user_id, expires
    `;
    if (!result.rows.length) return null;
    return {
      sessionToken,
      userId,
      expires,
    };
  },

  async deleteSession(sessionToken) {
    await sql`
      DELETE FROM sessions WHERE session_token=${sessionToken}
    `;
  },

  //TODO modify the expires to be shorter
  async createVerificationToken({ identifier, token, expires }) {
    // Only needed if using email provider (passwordless, magic link)
    console.log(
      `createVerificationToken identifier: ${identifier} token: ${token} expires: ${expires}`
    );
    //TODO is try catch needed for all of these adapter methods?
    try {
      await sql`
        INSERT INTO verification_token (identifier, token, expires)
        VALUES (${identifier}, ${token}, ${expires.toISOString()})
      `;
      return { identifier, token, expires };
    } catch (error) {
      console.error('Error creating verification token:', error);
      throw new Error('Failed to create verification token.');
    }
  },
  async useVerificationToken({ identifier, token }) {
    // Only needed if using email provider
    console.log(`useVerificationToken id: ${identifier} and token: ${token}`);
    try {
      const { rows } = await sql`
        SELECT * FROM verification_token WHERE identifier=${identifier} AND 
        token=${token} AND expires > NOW() LIMIT 1
      `;
      if (rows.length === 0) {
        console.warn('No valid verification token found.');
        return null;
      }

      const verificationToken = rows[0] as VerificationToken;
      const result = await sql`
        DELETE FROM verification_token 
        WHERE identifier=${identifier} AND token=${token}
      `;
      //TODO what should I do if delete fails?
      if (result.rowCount != 1) {
        console.warn('Delete verification token failed');
      }
      return verificationToken;
    } catch (error) {
      console.error('Error using verification token:', error);
      throw new Error('Failed to use verification token.');
    }
  },
};
