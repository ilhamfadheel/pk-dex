import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import SearchBox from "@/components/SearchBox";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Pocket Kingdom Dex", template: "%s · Pocket Kingdom Dex" },
  description:
    "Unit dex, evolution tree, emblem recipes and material planner for Pocket Kingdom: Own the World (N-Gage).",
};

const nav = [
  { href: "/", label: "Units" },
  { href: "/planner", label: "Planner" },
  { href: "/compare", label: "Compare" },
  { href: "/emblems", label: "Emblems" },
  { href: "/crafting", label: "Crafting" },
  { href: "/materials", label: "Materials" },
  { href: "/cities", label: "Cities" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-20 border-b border-line bg-panel/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/img/logo.png`}
                alt=""
                width={28}
                height={28}
                className="pixel h-7 w-7 rounded-md"
              />
              <span className="hidden sm:inline">Pocket Kingdom Dex</span>
            </Link>
            <nav className="flex gap-1 overflow-x-auto text-sm [scrollbar-width:none]">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-md px-2.5 py-1.5 text-muted hover:bg-panel-2 hover:text-ink"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <SearchBox />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-line py-4 text-center text-xs text-muted">
          Fan reference for Pocket Kingdom: Own the World (SEGA, N-Gage, 2004). Data and portraits
          from archived pk.warcry.com pages via the Pocket-Kingdom-Compendium project. Game assets ©
          SEGA.
        </footer>
      </body>
    </html>
  );
}
