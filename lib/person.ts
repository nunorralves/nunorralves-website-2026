// The one place the author identity is defined.
//
// Posts and projects each used to embed their own anonymous `Person` in their
// JSON-LD, under a name ("Nuno R. Alves") that appeared nowhere on the site.
// Search engines saw a fresh, unconnected author per page rather than one
// entity with a home. Everything now points at the `@id` below, which resolves
// to the full Person node rendered on /about.

export const SITE_URL = "https://nunorralves.pt";

export const ABOUT_URL = `${SITE_URL}/about`;

// A fragment id rather than the bare page URL: the page is a WebPage, the
// person described on it is a different thing, and they need distinct ids.
export const PERSON_ID = `${ABOUT_URL}#person`;

export const PERSON_NAME = "Nuno Alves";

// Profile URLs live here rather than in SocialLinks so that `sameAs` and the
// rendered icons cannot drift apart. This module is plain data with no React
// or lucide imports, so the component depends on it and not the reverse.
export const PROFILES = {
  github: "https://github.com/nunorralves",
  linkedin: "https://www.linkedin.com/in/nralves/",
  twitter: "https://twitter.com/nunorralves",
  email: "nunorralves@gmail.com",
} as const;

// Enough of the Person to be valid on its own, plus the shared `@id` that ties
// it back to the canonical node. Google flags an author that is a bare `@id`
// reference with no name, so this carries one.
export const authorRef = {
  "@type": "Person",
  "@id": PERSON_ID,
  name: PERSON_NAME,
  url: ABOUT_URL,
} as const;

export const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": PERSON_ID,
  name: PERSON_NAME,
  alternateName: "Nuno R. Alves",
  url: ABOUT_URL,
  mainEntityOfPage: ABOUT_URL,
  jobTitle: "Senior Director of Engineering, Platform",
  worksFor: {
    "@type": "Organization",
    name: "Entrust",
    url: "https://www.entrust.com",
  },
  description:
    "Engineering leader with twenty-five years in software and twenty leading teams, from embedded systems at Siemens through network software at Nokia Siemens Networks, Coriant and Infinera, then platform and IAM at Talkdesk, then identity verification at Onfido and Entrust.",
  knowsAbout: [
    "Platform engineering",
    "Engineering leadership",
    "Identity verification",
    "Distributed systems",
    "AI coding agents",
  ],
  sameAs: [PROFILES.github, PROFILES.linkedin, PROFILES.twitter],
} as const;
