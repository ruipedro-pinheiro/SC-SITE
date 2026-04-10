import { redirect } from "next/navigation";

/**
 * Root route — there is no marketing landing page (MOCKUP.md §11). The user
 * lands directly in the hangar.
 */
export default function Page(): never {
  redirect("/ships");
}
