"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { formatRub } from "@/lib/pricing";

function SuccessContent() {
  const sp = useSearchParams();
  const msg = sp.get("msg") || "Заказ принят.";
  const total = Number(sp.get("total") || 0);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
        ✓
      </div>
      <h1 className="text-2xl font-bold">Спасибо за заказ!</h1>
      {total > 0 && (
        <p className="mt-2 text-lg font-semibold text-neutral-800">
          {formatRub(total)}
        </p>
      )}
      <p className="mt-4 text-sm text-neutral-600">{msg}</p>
      <p className="mt-2 text-sm text-neutral-500">
        Мы свяжемся с вами для подтверждения.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg bg-black px-6 py-2.5 text-sm font-semibold text-white"
      >
        На главную
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-neutral-500">Загрузка…</div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
