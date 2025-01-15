import AcmeLogo from '@/app/ui/acme-logo';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import LoginForm from '@/app/ui/login-form';

export default async function MagicCodeLoginPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const session = await auth();
  if (session) {
    redirect('/dashboard');
  }
  const { email } = await searchParams;
  if (!email)
    return 'Invalid Access: Only can access magic code submission page after sending magic code to email';
  return (
    <main className="flex items-center justify-center md:h-screen">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
        <div className="flex h-20 w-full items-end rounded-lg bg-blue-500 p-3 md:h-36">
          <div className="w-32 text-white md:w-36">
            <AcmeLogo />
          </div>
        </div>
        <LoginForm email={email} passwordPlaceholder="Enter magic code" />
      </div>
    </main>
  );
}
