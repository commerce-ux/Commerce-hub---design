import { OrderDetailsPage } from "@/components/OrderDetailsPage";

interface OrderPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { orderId } = await params;
  return <OrderDetailsPage orderId={orderId} />;
}
