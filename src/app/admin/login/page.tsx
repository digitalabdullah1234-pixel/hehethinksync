import { redirect } from "next/navigation";
import { adminConfigured, isAdmin } from "@/lib/admin-auth";
import { LoginForm } from "../forms";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/");
  return (
    <main className="a-center">
      {adminConfigured() ? (
        <LoginForm />
      ) : (
        <div className="a-card a-login">
          <h1>Admin not set up</h1>
          <p>The server can&apos;t keep the admin&apos;s session secret. Make the data folder (DATA_DIR) writable, or set ADMIN_SECRET (16+ characters), then restart.</p>
        </div>
      )}
    </main>
  );
}
