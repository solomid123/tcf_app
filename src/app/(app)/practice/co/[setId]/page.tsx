import { notFound } from "next/navigation";
import { loadSet, toPublic } from "@/lib/bank";
import { getSession } from "@/lib/session";
import { Player } from "./Player";

export const metadata = { title: "Compréhension orale — TCF Prep" };

export default async function COSetPage({ params }: PageProps<"/practice/co/[setId]">) {
  const { setId } = await params;
  const { user } = await getSession();
  const loaded = await loadSet(setId, user.id);
  if (!loaded || loaded.set.skill !== "CO" || loaded.items.length === 0) notFound();
  return <Player setId={setId} title={loaded.set.title} items={loaded.items.map(toPublic)} />;
}
