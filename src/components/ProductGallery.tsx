"use client";

import { useState } from "react";
import ProductImage from "./ProductImage";

interface Props {
  images: string[];
  alt: string;
}

export default function ProductGallery({ images, alt }: Props) {
  const urls = images.length > 0 ? images : [""];
  const [active, setActive] = useState(0);
  const current = urls[Math.min(active, urls.length - 1)];

  return (
    <div className="space-y-3">
      <div className="aspect-[3/4] overflow-hidden rounded-xl bg-neutral-100">
        <ProductImage
          src={current}
          alt={alt}
          className="h-full w-full object-cover"
        />
      </div>

      {urls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Фото ${i + 1}`}
              className={`h-16 w-12 shrink-0 overflow-hidden rounded-md border-2 bg-neutral-100 sm:h-20 sm:w-14 ${
                i === active
                  ? "border-black"
                  : "border-transparent opacity-80 hover:opacity-100"
              }`}
            >
              <ProductImage
                src={url}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
