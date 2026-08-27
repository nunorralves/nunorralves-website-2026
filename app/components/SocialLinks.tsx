import { Github, Linkedin, Mail, Twitter } from "lucide-react";

// The home page hand-rolled these four icons as inline SVG, pasted straight
// from lucide - the same package Header, PostCard and ProjectCard already
// import from. Shared here so the footer can carry them too: a post reached
// from search never renders the home page, so without this the profiles are
// unreachable from most of the site.
const LINKS = [
  { href: "https://github.com/nunorralves", label: "GitHub", Icon: Github },
  {
    href: "https://www.linkedin.com/in/nralves/",
    label: "LinkedIn",
    Icon: Linkedin,
  },
  { href: "mailto:nunorralves@gmail.com", label: "Email", Icon: Mail },
  { href: "https://twitter.com/nunorralves", label: "Twitter", Icon: Twitter },
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
