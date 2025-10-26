import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type OrderRecord = Tables<"orders">;

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const orderId = searchParams.get('order_id');

  useEffect(() => {
    if (!user || !orderId) {
      navigate('/');
      return;
    }

    checkPaymentStatus();
  }, [user, orderId, navigate]);

  const checkPaymentStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke<{ order: OrderRecord }>('check-payment-status', {
        body: { order_id: orderId }
      });

      if (error) throw error;

      setOrder(data?.order ?? null);
      
      // Show success message
      toast.success('Pembayaran berhasil!');
    } catch (error) {
      console.error('Error checking payment status:', error);
      toast.error('Gagal memeriksa status pembayaran');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memverifikasi pembayaran...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Pembayaran Berhasil!</CardTitle>
              <p className="text-muted-foreground">
                Terima kasih atas pembelian Anda. Pesanan Anda sedang diproses.
              </p>
            </CardHeader>
            <CardContent>
              {order && (
                <div className="space-y-6">
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h3 className="font-semibold mb-2">Detail Pesanan</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Nomor Pesanan:</span>
                        <p className="font-medium">{order.order_number}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <p className="font-medium">{formatPrice(order.total)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <p className="font-medium capitalize">{order.status ?? "pending"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Metode Pengiriman:</span>
                        <p className="font-medium capitalize">{order.shipping_method ?? "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Informasi Pengiriman</h3>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Nama:</span> {order.nama_pembeli ?? "-"}</p>
                      <p><span className="text-muted-foreground">Email:</span> {order.email_pembeli ?? "-"}</p>
                      <p><span className="text-muted-foreground">Telepon:</span> {order.telepon_pembeli ?? "-"}</p>
                      <p><span className="text-muted-foreground">Alamat:</span> {order.shipping_address ?? "-"}</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-800">Langkah Selanjutnya</h3>
                    </div>
                    <p className="text-blue-700 text-sm mt-2">
                      Pesanan Anda akan diproses dalam 1-2 hari kerja. Anda akan menerima email konfirmasi 
                      beserta nomor resi pengiriman setelah pesanan dikirim.
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Button onClick={() => navigate('/orders')} className="flex-1">
                      <Package className="w-4 h-4 mr-2" />
                      Lihat Pesanan Saya
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/shop')} className="flex-1">
                      Belanja Lagi
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
