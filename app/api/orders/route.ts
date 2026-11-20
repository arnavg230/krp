import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function clean(value: unknown, max = 500) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function phoneDigits(value: string) { return value.replace(/\D/g, "").slice(-15); }

export async function POST(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const input = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const customer = input.customer && typeof input.customer === "object" ? input.customer as Record<string, unknown> : {};
  const name = clean(customer.name, 100), phone = phoneDigits(clean(customer.phone, 40));
  const email = clean(customer.email, 160), address = clean(customer.address, 1000), note = clean(customer.note, 500);
  const items = Array.isArray(input.items) ? input.items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
  if (name.length < 2 || phone.length < 8 || address.length < 8 || !items.length || items.length > 20) return NextResponse.json({ error: "Please check your name, phone, delivery address, and selection." }, { status: 400 });
  const safeItems = items.filter((item) => typeof item.productId === "string" && Number.isInteger(item.quantity) && Number(item.quantity) > 0 && Number(item.quantity) <= 20).map((item) => ({ product_id: item.productId as string, quantity: Number(item.quantity) }));
  if (safeItems.length !== items.length) return NextResponse.json({ error: "One or more quantities are invalid." }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ mode: "demo", orderNumber: `DEMO-${Date.now().toString().slice(-7)}` });
  const { data, error } = await supabase.rpc("place_order", { p_customer_name: name, p_phone: phone, p_email: email || null, p_delivery_address: address, p_note: note || null, p_items: safeItems });
  if (error) return NextResponse.json({ error: error.message.includes("stock") ? "One item has just sold out. Please update your bag and try again." : "We couldn't send the enquiry. Please try again." }, { status: 409 });
  return NextResponse.json({ orderNumber: data.order_number });
}
