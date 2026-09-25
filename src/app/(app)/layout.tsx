import { AppHeader } from "@/components/AppHeader";
import { Backdrop } from "@/components/Backdrop";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, profile } = await getSession();
  return (
    <>
      <Backdrop />
      <AppHeader avatarUrl={profile?.avatar_url} name={profile?.full_name ?? user.email} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-14">{children}</main>
    </>
  );
}
