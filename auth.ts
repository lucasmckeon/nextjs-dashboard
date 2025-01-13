import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import {
  encode as defaultEncode,
  decode as defaultDecode,
} from 'next-auth/jwt';
import { myAdapter } from './myAdapter';
import transporter from './app/lib/auth/mailer';

async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User>`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

async function userExists(userId: string) {
  const { rows } = await sql`
    SELECT 1 FROM users WHERE id = ${userId} LIMIT 1;
  `;
  return rows.length > 0;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: myAdapter,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
            isSignUp: z.boolean().default(false),
          })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password, isSignUp } = parsedCredentials.data;
          let user = await getUser(email);
          if (!user && !isSignUp) {
            console.log('Sign in failed: No user for email');
            return null;
          }
          if (user && isSignUp) {
            console.log('Sign up failed: User already exists');
            return null;
          }
          let inserted;
          if (!user && isSignUp) {
            //Insert into database
            try {
              const hashedPassword = await bcrypt.hash(password, 10);
              inserted = await sql<User>`
                INSERT INTO users (email, password)
                VALUES (${email}, ${hashedPassword})
                RETURNING *
              `;
            } catch (error) {
              console.error('Error creating new user during sign up:', error);
              return null;
            }
            user = inserted.rows[0];
            console.log(`New user created during sign up ${user?.id}`);
          }
          if (!user) {
            throw new Error(
              'Something is wrong in auth.ts credentials authorize'
            );
          }
          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user;
        }

        console.log('Invalid credentials format');
        return null;
      },
    }),
    {
      id: 'email',
      name: 'Email',
      type: 'email',
      server: {
        host: process.env.SENDGRID_HOST,
        port: Number(process.env.SENDGRID_PORT),
        auth: {
          user: process.env.SENDGRID_USER, // 'apikey' for SendGrid
          pass: process.env.SENDGRID_PASS, // Your SendGrid API key
        },
      },
      from: process.env.EMAIL_FROM,
      async sendVerificationRequest({ identifier: email, url, provider }) {
        try {
          const urlObj = new URL(url);
          const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

          await transporter.sendMail({
            to: email,
            from: provider.from, // or process.env.EMAIL_FROM
            subject: `Sign in to ${baseUrl}`,
            text: `Sign in to ${baseUrl}\n\n${url}\n\nIf you did not request this, please ignore this email.`,
            html: `
              <p>Sign in to <strong>${baseUrl}</strong> by clicking the link below:</p>
              <p><a href="${url}">Sign in</a></p>
              <p>If you did not request this, please ignore this email.</p>
            `,
          });
        } catch (error) {
          console.error('Error sending magic link email:', error);
          throw new Error('Failed to send magic link email.');
        }
      },
    },
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === 'credentials' && user) {
        token.credentials = true;
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // If we want the user ID in session:
      if (token?.sub) {
        session.user.id = token.sub;
      }
      const user = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      };
      const sanitizedSession = {
        user,
        expires: session.expires,
      };
      console.log(
        'Sanitized Session from callbacks.session:',
        sanitizedSession
      );
      //Ensure we don't return the password
      return sanitizedSession;
    },
  },
  jwt: {
    encode: async function (params) {
      if (params.token?.credentials) {
        const sessionToken = uuid();

        if (!params.token.sub) {
          throw new Error('No user ID found in token');
        }

        //TODO Support multiple logins by binding sessions to IP address or some unique fingerprint

        await myAdapter?.createSession?.({
          sessionToken: sessionToken,
          userId: params.token.sub,
          //Any value but 30 causes an error
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        return sessionToken;
      }
      return defaultEncode(params);
    },
    //Never called as I believe auth.js does this check itself,
    //keeping here to signal what auth.js does by default
    async decode(params) {
      console.log('DECODE FUNCTION CALLED');
      try {
        // Attempt to decode as normal JWT
        return await defaultDecode(params);
      } catch (err) {
        // If decode fails, maybe it's the random token from DB
        const sessionToken = params.token ?? '';
        const result = await myAdapter?.getSessionAndUser?.(sessionToken);
        if (!result) return null;

        const { session, user } = result;
        // Return an object with at least `sub` so NextAuth recognizes the user
        return {
          sub: user.id,
          name: user.name,
          email: user.email,
        };
      }
    },
  },
  secret: process.env.AUTH_SECRET!,
  experimental: { enableWebAuthn: true },
  debug: true,
});
