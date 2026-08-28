import Link from "next/link";

const links = [
  { href: "/concierge", label: "Concierge" },
  { href: "/guide", label: "Guide" },
  { href: "/verify", label: "Verify" },
];

export function NavBar() {
  return (
    <header className="bg-brand-blue">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/concierge" className="text-xl font-bold text-white tracking-tight">
          Guidemate
        </Link>
        <nav className="flex gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-white/85 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
