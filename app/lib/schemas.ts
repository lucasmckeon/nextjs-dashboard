import { z } from 'zod';

export const SignInCredentialsSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export const SignUpCredentialsSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  name: z.string(),
  password: z.string(),
  // password: z
  //   .string()
  //   .min(8, { message: 'Password must be at least 8 characters long.' })
  //   .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/, {
  //     message:
  //       'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.',
  //   }),
});
