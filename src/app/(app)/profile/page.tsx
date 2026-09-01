import ProfileView from "@/components/ProfileView";
import { getMyManageableCafes } from "@/app/actions/owner";

export const metadata = {
  title: "โปรไฟล์ — Profile",
};

export default async function ProfilePage() {
  const ownedCarSlugs = await getMyManageableCafes();
  return <ProfileView ownedSlugs={ownedCarSlugs.map((c) => c.slug)} />;
}
