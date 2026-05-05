import { redirect } from "next/navigation";

// Immediately redirect to login; the login page handles the already-logged-in case
export default function Home() {
  redirect("/login");
}
