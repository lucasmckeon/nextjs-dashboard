'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { SignInCredentialsSchema, SignUpCredentialsSchema } from './schemas';
import bcrypt from 'bcrypt';
import { User } from './definitions';
import * as crypto from 'crypto';
import transporter from './auth/mailer';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ date: true });
export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export type SignUpState = {
  errors?: {
    email?: string[];
    name?: string[];
    password?: string[];
  };
  message?: string | null;
};
export const createInvoice = async (prevState: State, formData: FormData) => {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message:
        'Create invoice fields inputed incorrectly. Failed to create invoice.',
    };
  }
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];
  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
    revalidatePath('/dashboard/invoices');
  } catch (error) {
    return {
      message: 'Database Error: Failed to Create Invoice',
    };
  }
  //Redirect works by throwing an error, so much be called outside trycatch
  redirect('/dashboard/invoices');
};

export const updateInvoice = async (invoiceId: string, formData: FormData) => {
  const { customerId, amount, status } = UpdateInvoice.parse({
    id: invoiceId,
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  const amountInCents = amount * 100;
  try {
    await sql`
          UPDATE invoices
          SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
          WHERE id = ${invoiceId}
        `;
    revalidatePath('/dashboard/invoices');
  } catch (error) {
    return {
      message: 'Database Error: Failed to Update Invoice',
    };
  }
  redirect('/dashboard/invoices');
};

export const deleteInvoice = async (invoiceId: string) => {
  try {
    await sql`DELETE FROM invoices WHERE id = ${invoiceId}`;
  } catch (error) {
    return {
      message: 'Database Error: Failed to Delete Invoice',
    };
  }
  revalidatePath('/dashboard/invoices');
  return { message: 'Deleted Invoice.' };
};

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  const validatedFields = SignInCredentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!validatedFields.success) {
    return 'Sign in fields incorrectly inputted. Sign in failed.';
  }
  const { email, password } = validatedFields.data;
  try {
    await signIn('credentials', {
      redirect: true,
      redirectTo: '/dashboard',
      email,
      password,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      console.error(`Sign in auth error: ${error.message}`);
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

export const signUp = async (prevState: SignUpState, formData: FormData) => {
  const validatedFields = SignUpCredentialsSchema.safeParse({
    email: formData.get('email'),
    name: formData.get('username'),
    password: formData.get('password'),
  });
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Sign up fields incorrectly inputted. Sign up failed.',
    };
  }
  const { email, name, password } = validatedFields.data;
  let user;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const inserted = await sql<User>`
                INSERT INTO users (email, password,name)
                VALUES (${email}, ${hashedPassword},${name})
                RETURNING *
              `;
    user = inserted.rows[0];
    if (!user) {
      return {
        message:
          'No user returned from insert database operation during sign up',
      };
    }
  } catch (error) {
    console.error('Error creating new user during sign up:', error);
    return { message: 'Error inserting into database during sign up' };
  }
  console.log(`New user created during sign up ${user.id}`);
  try {
    //TODO is this correct usage of redirect and redirectTo?
    await signIn('credentials', {
      redirect: true,
      redirectTo: '/dashboard',
      email: email,
      password: password,
    });
    //Unreachable return, but must include so typescript doesn't complain when we consume signUp in useActionState
    return {
      message:
        'Sign in successful, but this should never be reached unless signIn redirect functionality changes.',
    };
  } catch (error) {
    if (error instanceof AuthError) {
      console.error(`Sign in after sign up auth error: ${error.message}`);
      switch (error.type) {
        case 'CredentialsSignin':
          return { message: 'Invalid credentials.' };
        default:
          return { message: 'Something went wrong.' };
      }
    }
    //Must rethrow error for our redirect to work
    throw error;
  }
};

export async function magicLink(
  prevState: string | undefined,
  formData: FormData
) {
  const email = formData.get('email');

  if (typeof email !== 'string') {
    return 'Invalid form data.';
  }
  try {
    await signIn('email', {
      redirect: true,
      redirectTo: '/dashboard',
      email,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      console.error(`actions.ts: Magic link auth error: ${error.message}`);
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        case 'AccessDenied':
          return 'Magic Link sign up failed because there is no user with the provided email';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

export async function sendMagicCode(
  prevState: string | undefined,
  formData: FormData
) {
  const magicCode = crypto.randomInt(100000, 1000000).toString();
  const email = formData.get('email');
  if (typeof email !== 'string') return 'Must provide email';
  try {
    const { rows } = await sql`
      SELECT * FROM users WHERE email=${email} LIMIT 1
    `;
    if (!rows.length) {
      return 'Magic code sign up failed because there is no user with the provided email';
    }
  } catch (error) {
    console.error(
      'Error occurred during sendOTP when querying to see if a user with the provided email exists',
      error
    );
    return 'Database error, please try again';
  }
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  try {
    const result = await sql`
      INSERT INTO otp_codes (email,code,expires) VALUES (${email},${magicCode},${expires.toISOString()})
    `;
    if (!result.rowCount) return 'Insertion into otp codes failed';
  } catch (error) {
    return 'Database Error';
  }
  await sendMagicCodeEmail(email, magicCode, expires);
  redirect(`/login/magic-code?email=${encodeURIComponent(email)}`);
}

async function sendMagicCodeEmail(email: string, code: string, expires: Date) {
  await transporter.sendMail({
    to: email,
    from: process.env.EMAIL_FROM,
    subject: `Trivia Battle Magic Code`,
    text: `Sign in to Trivia Battle with the following magic code. If you did not request this, please ignore this email.`,
    html: `
      <p>Sign in to Trivia Battle with code</p>
      <p>${code}</p>
      <p>Code expires: ${expires.toLocaleString()}. Code only valid once.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  });
}
