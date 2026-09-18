"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { getAllProducts } from "@/lib/products";
import { FALLBACK_EUR_RATE } from "@/lib/cbr";
import { formatRub, toRub } from "@/lib/pricing";
import type { OrderPayload } from "@/lib/types";

const products = getAllProducts();

export default function CheckoutPage() {
  const router = useRouter();
  const { items, ready, clear } = useCart();
  const [eurRate, setEurRate] = useState(FALLBACK_EUR_RATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    fetch("/api/rate")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.rate === "number") setEurRate(d.rate);
      })
      .catch(() => {});
  }, []);

  const orderItems = useMemo(() => {
    return items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const priceRub = toRub(product.priceEur, eurRate);
        return {
          productId: product.id,
          titleRu: product.titleRu,
          brand: product.brand,
          size: item.size,
          qty: item.qty,
          priceEur: product.priceEur,
          priceRub,
        };
      })
      .filter(Boolean) as OrderPayload["items"];
  }, [items, eurRate]);

  const totalRub = orderItems.reduce((s, i) => s + i.priceRub * i.qty, 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (orderItems.length === 0) {
      setError("Корзина пуста");
      return;
    }
    setSubmitting(true);

    const payload: OrderPayload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      comment: comment.trim(),
      items: orderItems,
      totalRub,
      eurRate,
    };

    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Ошибка оформления");
        setSubmitting(false);
        return;
      }
      clear();
      const q = new URLSearchParams({
        msg: data.message || "Заказ принят",
        total: String(totalRub),
      });
      router.push(`/checkout/success?${q.toString()}`);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-neutral-500">
        Загрузка…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Нечего оформлять</h1>
        <Link href="/cart" className="mt-4 inline-block text-sm underline">
          Вернуться в корзину
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Оформление заказа</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Итого: <strong>{formatRub(totalRub)}</strong> · {orderItems.length}{" "}
        поз.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Имя *" value={name} onChange={setName} required />
        <Field
          label="Телефон *"
          value={phone}
          onChange={setPhone}
          type="tel"
          required
          placeholder="+7 …"
        />
        <Field
          label="Email *"
          value={email}
          onChange={setEmail}
          type="email"
          required
        />
        <div>
          <label className="mb-1 block text-sm font-medium">Адрес *</label>
          <textarea
            required
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
            placeholder="Город, улица, дом, квартира"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Комментарий</label>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
            placeholder="Удобное время звонка и т.п."
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-black py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {submitting ? "Отправка…" : "Подтвердить заказ"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-black"
      />
    </div>
  );
}
