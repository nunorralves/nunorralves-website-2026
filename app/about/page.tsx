import type { Metadata } from "next";
import { SocialLinks } from "app/components/SocialLinks";
import { ABOUT_URL, personJsonLd } from "lib/person";

const title = "About Nuno Alves";
const description =
  "Nuno Alves, engineering leader. Twenty-five years in software and twenty leading teams, from embedded systems at Siemens to platform engineering at Entrust. Platforms, the teams that build them, and what I build outside work.";

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
    <div className='mx-auto w-2/3 py-8'>
      <div className='bg-background text-foreground'>
        <h1 className='my-4 text-3xl font-black'>About</h1>

        <p className='mb-10 text-lg'>
          I am Nuno Alves. I run Platform engineering at Entrust, in identity
          verification. Twenty-five years in software, twenty of them leading
          teams.
        </p>

        <section className='mb-12'>
          <h2 className='text-xl font-semibold mb-4'>What I do now</h2>
          <p className='mb-4 font-normal'>
            Platform at Entrust means the layer everyone else builds on:
            workflow orchestration, the public APIs, the reliability work nobody
            notices until it is missing, and more recently agentic AI and the EU
            digital identity rules that are about to reshape how verification
            works.
          </p>
          <p className='font-normal'>
            The job itself has not changed much in ten years, only the altitude.
            Decide what we own. Decide who owns it. Keep the architecture and
            the org chart from drifting apart, because once they drift, most of
            what goes wrong afterwards is a symptom of that.
          </p>
        </section>

        <section className='mb-12'>
          <h2 className='text-xl font-semibold mb-4'>How I got here</h2>
          <p className='mb-4 font-normal'>
            I started in embedded systems at Siemens, close enough to the
            hardware that debugging meant reaching for an oscilloscope. That
            turned into network software at Nokia Siemens Networks, then
            Coriant, then Infinera. Optical transport, carrier grade: systems
            that ship to networks nobody is allowed to take down in order to fix
            them. You learn to be careful, and you learn exactly how expensive
            careful is.
          </p>
          <p className='mb-4 font-normal'>
            Then Talkdesk, and cloud, first on platform and then on identity and
            access management. Every constraint inverted. Instead of one release
            a year to operators who plan their quarter around it, deploys all
            day to customers who should never notice one happened.
          </p>
          <p className='font-normal'>
            Then Onfido, which became Entrust. Identity verification: proving a
            person is who they claim to be, at the scale and the latency the
            internet expects, in a domain where being wrong in either direction
            has a real cost.
          </p>
        </section>

        <section className='mb-12'>
          <h2 className='text-xl font-semibold mb-4'>The thread</h2>
          <p className='mb-4 font-normal'>
            Two things run through all of it, and one accident.
          </p>
          <p className='mb-4 font-normal'>
            The two are platforms and the teams that build them, which I have
            come to think are one problem rather than two. A platform with four
            owners is not a platform. It is four platforms sharing a repository
            and an unresolved argument. Most of the platform work I am proudest
            of looks, in hindsight, like org design.
          </p>
          <p className='font-normal'>
            The accident is that I have been through four ownership changes:
            Siemens into Nokia Siemens Networks, the optical business into
            Coriant, Coriant into Infinera, Onfido into Entrust. The early ones
            I experienced from the engineering floor, where decisions arrived
            from somewhere I could not see and rarely came with their reasoning
            attached. The later ones from the leadership side, where I found out
            how little of that reasoning survives the trip down even when you
            are trying hard to send it. I did not set out to learn this, but it
            is the thing I know best: what actually happens to engineering teams
            when the logo changes, which parts of it are unavoidable, and which
            parts are just nobody doing the work of explaining.
          </p>
        </section>

        <section className='mb-12'>
          <h2 className='text-xl font-semibold mb-4'>Outside work</h2>
          <p className='font-normal'>
            I build things and write about them. Most of that right now is agent
            systems: a terminal coding agent of my own, skills and extensions
            for it, multi-agent setups that do not behave the way the demos
            imply. Some of it is hardware, because I never entirely left
            embedded systems behind and a bench power supply is a decent excuse
            to own an oscilloscope again. This site is on the list too.
          </p>
        </section>

        <section className='mb-12'>
          <h2 className='text-xl font-semibold mb-4'>What this site is</h2>
          <p className='mb-4 font-normal'>
            The workshop. Rough, current, and honest about the parts that did
            not work.
          </p>
          <p className='mb-4 font-normal'>
            If you came here from LinkedIn, that profile is the record: titles,
            dates, scope, the version where everything went to plan. This is the
            other half. It is what I actually do with my hands, including the
            attempts that went nowhere, which are usually the ones worth writing
            up.
          </p>
          <p className='font-normal'>
            What it is not: a portfolio, a consulting pitch, or a place I
            publish things only once I am sure of them. Most of what is here I
            am still arguing with.
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
