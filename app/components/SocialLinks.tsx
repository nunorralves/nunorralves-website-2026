import { Github, Linkedin, Mail, Rss, Twitter } from "lucide-react";
import { PROFILES } from "lib/person";

// The home page hand-rolled these four icons as inline SVG, pasted straight
// from lucide - the same package Header, PostRow and ProjectCard already
// import from. Shared here so the footer can carry them too: a post reached
// from search never renders the home page, so without this the profiles are
// unreachable from most of the site.
//
// The URLs themselves come from lib/person, so these icons and the `sameAs`
// array in the Person JSON-LD on /about cannot fall out of step.
const LINKS = [
  { href: PROFILES.github, label: "GitHub", Icon: Github },
  { href: PROFILES.linkedin, label: "LinkedIn", Icon: Linkedin },
  { href: `mailto:${PROFILES.email}`, label: "Email", Icon: Mail },
  { href: PROFILES.twitter, label: "Twitter", Icon: Twitter },
  // Last, and deliberately not in PROFILES: the feed is a site resource, not
  // a profile that identifies me, so it must not leak into the `sameAs` array
  // that PROFILES feeds. The path is a fixed literal here the same way it is
  // in the <head> autodiscovery tag.
  { href: "/feed.xml", label: "RSS feed", Icon: Rss },
];

export function SocialLinks({ size = "w-6 h-6" }: { size?: string }) {
  return (
    <div className='flex items-center gap-3'>
      {LINKS.map(({ href, label, Icon }) => (
        <a
          key={href}
          href={href}
          aria-label={label}
          {...(href.startsWith("http")
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className='text-muted-foreground hover:text-foreground transition-colors'
        >
          <Icon className={size} />
        </a>
      ))}
    </div>
  );
}
