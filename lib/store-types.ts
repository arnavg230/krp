export type OrderItem = {
  product_name: string;
  pack_label: string;
  quantity: number;
};

export type StoreOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  email?: string;
  delivery_address: string;
  note?: string;
  status: string;
  payment_status?: string;
  total: number | null;
  created_at: string;
  order_items: OrderItem[];
};
