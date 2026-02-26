import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthPanel } from "@/app/sign-in/auth-panel";
import { getServerUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign In",
  description: "Access your NaijaAuto account.",
};

interface SignInPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getStringParam(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
}

function toSafeRedirectPath(candidate: string | undefined): string {
  if (!candidate) {
    return "/";
  }

  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/";
  }

  if (candidate.startsWith("/sign-in")) {
    return "/";
  }

  return candidate;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const nextPath = toSafeRedirectPath(getStringParam(params.next));
  const message = getStringParam(params.message);

  const user = await getServerUser();
  if (user) {
    redirect(nextPath);
  }

  return (
    <div className="page-shell">
      <header className="top-nav">
        <Link className="brand-mark" href="/">
          NaijaAuto Marketplace
        </Link>
        <nav className="nav-links">
          <Link className="nav-link" href="/listings">
            Browse Cars
          </Link>
        </nav>
      </header>

      <AuthPanel nextPath={nextPath} initialMessage={message} />
    </div>
  );
}
