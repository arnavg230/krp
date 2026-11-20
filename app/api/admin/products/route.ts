import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function productInput(body: Record<string, unknown> | null) {
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
  const category = typeof body?.category === "string" ? body.category.trim().slice(0, 60) : "";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 500) : "";
  const image_url = typeof body?.image_url === "string" ? body.image_url.trim().slice(0, 500) : "";
  const pack_label = typeof body?.pack_label === "string" ? body.pack_label.trim().slice(0, 40) : "";
  const price = body?.price === "" || body?.price === null ? null : Number(body?.price);
  const stock_quantity = Number(body?.stock_quantity);
  const is_active = body?.is_active === true || body?.is_active === "true";
  if (name.length < 2 || !category || !pack_label || !image_url || (price !== null && (!Number.isInteger(price) || price < 0)) || !Number.isInteger(stock_quantity) || stock_quantity < 0) return null;
  return { name, category, description, image_url, pack_label, price, stock_quantity, is_active };
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { body, file, error: formError } = await readProductForm(request);
  if (formError) return NextResponse.json({ error: formError }, { status: 400 });
  const values = productInput(body);
  if (!values) return NextResponse.json({ error: "Check the product name, pack, price, stock, and image path." }, { status: 400 });
  const imageUrl = await storePhoto(file);
  if (file && !imageUrl) return NextResponse.json({ error: "The product photo could not be uploaded. Check the Supabase product-photos bucket." }, { status: 400 });
  const slug = values.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || crypto.randomUUID();
  const { data, error } = await createSupabaseAdminClient()!.from("products").insert({ ...values, image_url: imageUrl || values.image_url, slug }).select().single();
  if (error) return NextResponse.json({ error: "Could not add the product. A product may already use that name." }, { status: 409 });
  return NextResponse.json({ product: data });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { body, file, error: formError } = await readProductForm(request);
  if (formError) return NextResponse.json({ error: formError }, { status: 400 });
  const values = productInput(body);
  if (!values || typeof body?.id !== "string") return NextResponse.json({ error: "Invalid product update." }, { status: 400 });
  const imageUrl = await storePhoto(file);
  if (file && !imageUrl) return NextResponse.json({ error: "The product photo could not be uploaded. Check the Supabase product-photos bucket." }, { status: 400 });
  const { data, error } = await createSupabaseAdminClient()!.from("products").update({ ...values, image_url: imageUrl || values.image_url }).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: "Could not save this product." }, { status: 400 });
  return NextResponse.json({ product: data });
}

async function readProductForm(request: Request) {
  try {
    const form = await request.formData();
    const input = form.get("photo");
    const file = input instanceof File && input.size ? input : null;
    const body = Object.fromEntries(["id", "name", "category", "description", "image_url", "pack_label", "price", "stock_quantity", "is_active"].map((key) => [key, form.get(key)]));
    if (file && file.size > 5 * 1024 * 1024) return { body, file: null, error: "Photos must be 5 MB or smaller." };
    if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { body, file: null, error: "Choose a JPG, PNG, or WebP photo." };
    return { body, file, error: "" };
  } catch { return { body: null, file: null, error: "Invalid product form." }; }
}

async function storePhoto(file: File | null) {
  if (!file) return "";
  const supabase = createSupabaseAdminClient();
  if (!supabase) return "";
  const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("product-photos").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) return "";
  return supabase.storage.from("product-photos").getPublicUrl(path).data.publicUrl;
}
