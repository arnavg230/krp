import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function isAdmin() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  const emails = (process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  return Boolean(user?.email && emails.includes(user.email.toLowerCase()));
}

export async function requireAdminApi() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false as const, status: 503, message: "Connect Supabase to enable the admin dashboard." };
  const { data: { user } } = await supabase.auth.getUser();
  const emails = (process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!user?.email || !emails.includes(user.email.toLowerCase())) return { ok: false as const, status: 401, message: "Admin sign-in required." };
  return { ok: true as const };
}
