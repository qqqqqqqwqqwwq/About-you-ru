export default function Footer() {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-8 text-center text-sm text-neutral-500">
        <p className="font-medium text-neutral-700">Распродажа</p>
        <p className="mt-1">Демо-витрина MVP. Цены в ₽ по курсу ЦБ × 1,5.</p>
        <p className="mt-2 text-xs">© {new Date().getFullYear()} · без регистрации · только каталог и заказ</p>
      </div>
    </footer>
  );
}
