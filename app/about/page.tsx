import type { Metadata } from "next";
import Link from "next/link";
import { SocialLinks } from "app/components/SocialLinks";
import { ABOUT_URL, personJsonLd } from "lib/person";

const title = "About Nuno Alves";
const description =
  "Nuno Alves, engineering leader. Platform engineering at Entrust, in identity verification, after twenty-five years in software and twenty leading teams. What I build outside work, and what this site is for.";

// A full title rather than a bare "About": the root layout has no title
// template, so a one-word title is all a tab or a search result would show,
// and this is the page most likely to be found by someone searching the name.
export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: ABOUT_URL,
  },
  openGraph: {
    url: ABOUT_URL,
    title,
    description,
    type: "profile",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function AboutPage() {
  return (
    <div className='mx-auto w-11/12 md:w-2/3 py-8'>
      <div className='bg-background text-foreground'>
        <h1 className='my-4 text-3xl font-black'>About</h1>

        {/* Deliberately says nothing about the current employer. "What I do
            now" is one line below and owns that, so the page states it once
            rather than twice in three paragraphs, and this paragraph survives
            a job change untouched. */}
        <p className='mb-10 text-lg'>
          I am Nuno Alves, an engineering leader. Twenty-five years in software,
          twenty of them leading teams, from embedded systems through carrier
          grade network software to cloud platforms.
        </p>

        {/* Deliberately short. LinkedIn is the claim and this site is the
            confirmation, and what a reader is confirming here is whether I
            still build things myself - which a career narrative does not
            answer. The longer version of that story belongs in a post, where
            it is an argument being made rather than a fact being asserted. */}
        <section className='mb-12'>
          <h2 className='text-xl font-semibold mb-4'>What I do now</h2>
          <p className='mb-4 font-normal'>
            I run Platform engineering at Entrust, in identity verification.
            Platform there means the layer everyone else builds on: workflow
            orchestration, the public APIs, the reliability work nobody notices
            until it is missing, and more recently agentic AI and EU digital
            identity.
          </p>
          <p className='font-normal'>
            The job has not changed much in ten years, only the altitude. Decide
            what we own. Decide who owns it. Keep the architecture and the org
            chart from drifting apart, because once they drift, most of what
            goes wrong afterwards is a symptom of that.
          </p>
        </section>

        <section className='mb-12'>
          <h2 className='text-xl font-semibold mb-4'>
            What I build outside work
          </h2>
          <p className='mb-4 font-normal'>
            Mostly agent systems at the moment: a terminal coding agent of my
            own, skills and extensions for it, multi-agent setups that do not
            behave the way the demos imply. Also a barcode scanner that scores
            supermarket food, this site itself, and a bench power supply,
            because I never entirely left embedded systems behind.
          </p>
          {/* The page exists to let someone check whether I still build
              things, so it has to hand them the evidence rather than assert
              it. Characterised rather than enumerated: the list changes, and
              /projects is already the list. */}
          <p className='font-normal'>
            The{" "}
            <Link
              href='/projects'
              className='text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors'
            >
              projects page
            </Link>{" "}
            has the current set, and the{" "}
            <Link
              href='/blog'
              className='text-[var(--color-link)] hover:text-[var(--color-link-hover)] transition-colors'
            >
              writing
            </Link>{" "}
            covers agent systems, platform engineering and engineering
            leadership.
          </p>
        </section>

        <section className='mb-12'>
          <h2 className='text-xl font-semibold mb-4'>What this site is</h2>
          <p className='mb-4 font-normal'>
            The workshop. Rough, current, and honest about the parts that did
            not work.
          </p>
          <p className='font-normal'>
            If you came here from LinkedIn, that profile is the record: titles,
            dates, scope. This is the other half, and it is the half where you
            can check whether I still build things myself. What it is not: a
            portfolio, a consulting pitch, or a place I publish things only once
            I am sure of them.
          </p>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-4'>Getting in touch</h2>
          <p className='mb-6 font-normal'>
            Email is the fastest way to reach me. LinkedIn has the CV, GitHub
            has the code.
          </p>
          <div className='mb-8'>
            <SocialLinks />
          </div>
          <p className='text-sm'>
            Everything here is written on my own time. The views are mine, not
            my employer&apos;s.
          </p>
        </section>
      </div>

      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
    </div>
  );
}
