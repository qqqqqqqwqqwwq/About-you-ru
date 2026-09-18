"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";

const links = [
  { href: "/women", label: "Женщинам" },
  { href: "/men", label: "Мужчинам" },
];

export default function Header() {
  const pathname = usePathname();
  const { totalQty, ready } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight">
          Распродажа
        </Link>

        <nav className="flex items-center gap-1 sm:gap-4">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-2 py-1 text-sm font-medium transition ${
                  active
                    ? "text-black underline underline-offset-4"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/cart"
          className="relative flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
        >
          <span aria-hidden>🛒</span>
          <span className="hidden sm:inline">Корзина</span>
          {ready && totalQty > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-xs text-white">
              {totalQty}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
