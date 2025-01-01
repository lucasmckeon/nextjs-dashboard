'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ date: true });
export const createInvoice = async (formData: FormData) => {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
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
