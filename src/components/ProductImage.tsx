"use client";

import { useState } from "react";

interface Props {
  src: string;
  alt: string;
  className?: string;
}

const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
      <rect fill="#f3f4f6" width="600" height="800"/>
      <text x="50%" y="48%" text-anchor="middle" fill="#9ca3af" font-family="system-ui,sans-serif" font-size="28">Нет фото</text>
      <text x="50%" y="54%" text-anchor="middle" fill="#d1d5db" font-family="system-ui,sans-serif" font-size="18">Распродажа</text>
    </svg>`
  );

export default function ProductImage({ src, alt, className }: Props) {
  const [err, setErr] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={err || !src ? PLACEHOLDER : src}
      alt={alt}
      className={className}
      onError={() => setErr(true)}
      loading="lazy"
    />
  );
}
