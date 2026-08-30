import type { Metadata } from "next";

// Belt and braces with the X-Robots-Tag the proxy sets. The header is the
// one that counts, since it applies to a page fetched despite robots.txt, but
// a crawler that only reads the HTML gets the same answer here.
export const metadata: Metadata = {
  title: "Insights",
  robots: { index: false, follow: false },
};

// No prerender: the form carries a message chosen from the query string, and
// nothing about this page is worth caching.
export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

// Deliberately vague about which thing went wrong. "No such user" versus
// "wrong password" is the classic way a login form teaches an attacker half
// the answer, and although there is only one account here, the rate limit
// message is worth distinguishing so I can tell a lockout from a typo.
const MESSAGES: Record<string, string> = {
  "1": "That is not the password.",
  rate: "Too many attempts. Try again in a few minutes.",
  config: "ANALYTICS_SECRET is not set on this deployment, so no session can be signed.",
};

export default async function InsightsLoginPage({
  searchParams,
}: LoginPageProps) {
  const { error, next } = await searchParams;
  const message = error ? MESSAGES[error] : undefined;

  return (
    <div className='container-page py-16'>
      <p className='font-mono text-[0.65rem] uppercase tracking-[0.1em] text-[var(--color-secondary)]'>
        nunorralves.pt / insights
      </p>
      <h1 className='mt-2 mb-3 text-3xl'>Private</h1>
      <p className='mb-8 text-[var(--color-secondary)]'>
        This is the analytics dashboard for the site. It is not part of the
        public pages and there is nothing here for a visitor.
      </p>

      {/* A plain form posting to a route handler. No client component, no
          fetch, no state - the whole site ships almost no JavaScript and the
          page guarding it should not be the one exception. */}
      <form
        action='/api/insights/login'
        method='post'
        className='flex flex-col gap-3 max-w-sm'
      >
        {next ? <input type='hidden' name='next' value={next} /> : null}

        <label
          htmlFor='password'
          className='font-mono text-[0.65rem] uppercase tracking-[0.09em] text-[var(--color-secondary)]'
        >
          Password
        </label>
        <input
          id='password'
          name='password'
          type='password'
          autoComplete='current-password'
          autoFocus
          required
          className='rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-foreground outline-none focus:border-[var(--color-link)]'
        />

        <button
          type='submit'
          className='self-start rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:border-[var(--color-link)] hover:text-[var(--color-link)] transition-colors'
        >
          Sign in
        </button>

        {message ? (
          <p role='alert' className='text-sm text-[var(--color-secondary)]'>
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
