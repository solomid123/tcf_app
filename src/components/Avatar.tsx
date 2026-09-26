/* eslint-disable @next/next/no-img-element */
export function Avatar({ url, name, size = 32 }: { url?: string | null; name?: string | null; size?: number }) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  const style = { width: size, height: size, fontSize: size * 0.42 };
  return url ? (
    <img src={url} alt="" style={style} referrerPolicy="no-referrer" className="rounded-full border border-line object-cover" />
  ) : (
    <span style={style} className="grid place-items-center rounded-full border border-line bg-tint text-fg">
      {initial}
    </span>
  );
}
