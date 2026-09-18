import { NextResponse } from "next/server";
import { Resend } from "resend";
import type { OrderPayload } from "@/lib/types";

function isValidOrder(body: unknown): body is OrderPayload {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.name === "string" &&
    b.name.trim().length > 1 &&
    typeof b.phone === "string" &&
    b.phone.trim().length > 5 &&
    typeof b.email === "string" &&
    b.email.includes("@") &&
    typeof b.address === "string" &&
    b.address.trim().length > 5 &&
    Array.isArray(b.items) &&
    b.items.length > 0 &&
    typeof b.totalRub === "number"
  );
}

function formatEmailHtml(order: OrderPayload): string {
  const rows = order.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${i.brand} — ${i.titleRu}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${i.size}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${i.qty}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${i.priceRub.toLocaleString("ru-RU")} ₽</td>
        </tr>`
    )
    .join("");

  return `
    <h2>Новый заказ — Распродажа</h2>
    <p><strong>Имя:</strong> ${escapeHtml(order.name)}<br/>
    <strong>Телефон:</strong> ${escapeHtml(order.phone)}<br/>
    <strong>Email:</strong> ${escapeHtml(order.email)}<br/>
    <strong>Адрес:</strong> ${escapeHtml(order.address)}<br/>
    <strong>Комментарий:</strong> ${escapeHtml(order.comment || "—")}</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <thead>
        <tr>
          <th align="left" style="padding:6px 8px;border-bottom:2px solid #ccc">Товар</th>
          <th align="left" style="padding:6px 8px;border-bottom:2px solid #ccc">Размер</th>
          <th align="left" style="padding:6px 8px;border-bottom:2px solid #ccc">Кол-во</th>
          <th align="left" style="padding:6px 8px;border-bottom:2px solid #ccc">Цена</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px"><strong>Итого:</strong> ${order.totalRub.toLocaleString("ru-RU")} ₽
    (курс EUR ${order.eurRate.toFixed(2)} × 1,5)</p>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isValidOrder(body)) {
    return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
  }

  const order = body;
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.ORDER_TO_EMAIL;
  const fromEmail =
    process.env.ORDER_FROM_EMAIL || "Распродажа <onboarding@resend.dev>";

  if (!apiKey || !toEmail) {
    console.log("[order] email not configured — order logged:", JSON.stringify(order, null, 2));
    return NextResponse.json({
      ok: true,
      emailSent: false,
      message:
        "Заказ принят. Email не настроен (RESEND_API_KEY / ORDER_TO_EMAIL) — заказ записан в лог сервера.",
    });
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: order.email,
      subject: `Заказ: ${order.name} — ${order.totalRub.toLocaleString("ru-RU")} ₽`,
      html: formatEmailHtml(order),
    });

    return NextResponse.json({
      ok: true,
      emailSent: true,
      message: "Заказ принят и отправлен на email.",
    });
  } catch (err) {
    console.error("[order] resend failed:", err);
    console.log("[order] fallback log:", JSON.stringify(order, null, 2));
    return NextResponse.json({
      ok: true,
      emailSent: false,
      message:
        "Заказ принят, но отправка email не удалась. Заказ записан в лог сервера.",
    });
  }
}
