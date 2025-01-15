import AcmeLogo from '@/app/ui/acme-logo';
import LoginForm from '@/app/ui/login-form';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import MagicLinkForm from '../ui/magic-link-form';
import SendMagicCodeForm from '../ui/send-magic-code-form';

export default async function LoginPage() {
  const session = await auth();
  if (session) {
    redirect('/dashboard');
  }
  return (
    <main className="flex items-center justify-center md:h-screen">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
        <div className="flex h-20 w-full items-end rounded-lg bg-blue-500 p-3 md:h-36">
          <div className="w-32 text-white md:w-36">
            <AcmeLogo />
          </div>
        </div>
        <LoginForm />
        <MagicLinkForm />
        <SendMagicCodeForm />
        <Link
          href={'/signup'}
          className="flex h-10 items-center justify-center rounded-lg bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:bg-blue-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
