"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 2 * 1024 * 1024;

export function AvatarUploader({ userId, url, name }: { userId: string; url: string | null; name: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function clearFolder(supabase: ReturnType<typeof createClient>) {
    const { data } = await supabase.storage.from("avatars").list(userId);
    if (data?.length) await supabase.storage.from("avatars").remove(data.map((f) => `${userId}/${f.name}`));
  }

  async function save(avatar_url: string | null) {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ avatar_url }).eq("id", userId);
    if (error) throw error;
    setPreview(avatar_url);
    router.refresh();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Please choose an image.");
    if (file.size > MAX_BYTES) return setError("Image must be under 2 MB.");

    setBusy(true);
    try {
      const supabase = createClient();
      await clearFolder(supabase);
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      await save(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setBusy(true);
    setError(null);
    try {
      await clearFolder(createClient());
      await save(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <div className={busy ? "animate-pulse" : ""}><Avatar url={preview} name={name} size={72} /></div>
      <div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="btn btn-glass !px-4 !py-2 text-sm">
            {busy ? "Working…" : "Upload photo"}
          </button>
          {preview && (
            <button type="button" disabled={busy} onClick={onRemove} className="btn !px-4 !py-2 text-sm text-muted hover:text-fg">
              Remove
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">PNG, JPG, WEBP or GIF · max 2 MB</p>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={onFile} />
    </div>
  );
}
