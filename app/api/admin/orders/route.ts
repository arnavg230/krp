import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const statuses = ["pending", "confirmed", "packed", "dispatched", "delivered", "cancelled"];
export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string" || !statuses.includes(body.status)) return NextResponse.json({ error: "Invalid order update." }, { status: 400 });
  const supabase = createSupabaseAdminClient()!;
  const { error } = await supabase.from("orders").update({ status: body.status }).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message.includes("stock") ? "There isn't enough stock to confirm this order." : "Could not update the order." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
