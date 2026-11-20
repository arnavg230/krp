import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const digits = (value: unknown) => typeof value === "string" ? value.replace(/\D/g, "").slice(-15) : "";
export async function POST(request: Request) {
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const body = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const productId = typeof body.productId === "string" ? body.productId.slice(0, 80) : "";
  const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber.trim().slice(0, 40) : "";
  const phone = digits(body.phone), rating = Number(body.rating);
  if (!productId || !orderNumber || phone.length < 8 || !Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Enter a valid order reference, phone number, and star rating." }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ mode: "demo", summary: { average: rating, count: 1 } });
  const { data: order } = await supabase.from("orders").select("id,phone,status").eq("order_number", orderNumber).maybeSingle();
  if (!order || order.status !== "delivered" || order.phone !== phone) return NextResponse.json({ error: "Ratings are available after delivery. Check your order reference and phone." }, { status: 403 });
  const { error: insertError } = await supabase.from("reviews").upsert({ product_id: productId, order_id: order.id, rating }, { onConflict: "order_id,product_id" });
  if (insertError) return NextResponse.json({ error: "We couldn't save the rating. Please try again." }, { status: 400 });
  const { data: rows, error } = await supabase.from("reviews").select("rating").eq("product_id", productId);
  if (error) return NextResponse.json({ error: "The rating was saved, but the summary could not be refreshed." }, { status: 200 });
  const average = rows!.reduce((sum, row) => sum + row.rating, 0) / rows!.length;
  return NextResponse.json({ summary: { average, count: rows!.length } });
}
