import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ShoppingCart, 
  Home, 
  Phone,
  Mail,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface ErrorInfo {
  type: 'payment_failed' | 'payment_expired' | 'payment_cancelled' | 'system_error' | 'network_error' | 'unknown';
  message: string;
  orderId?: string;
  errorCode?: string;
  suggestion: string;
}

interface OrderDetails {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  nama_pembeli: string;
  email_pembeli: string;
  shipping_method: string;
}

const PaymentError = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);

  // Get parameters from URL
  const orderId = searchParams.get('order_id');
  const errorType = searchParams.get('error_type');
  const errorCode = searchParams.get('error_code');
  const transactionStatus = searchParams.get('transaction_status');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    initializeErrorPage();
  }, [user, orderId, errorType, errorCode, transactionStatus]);

  const initializeErrorPage = async () => {
    try {
      setLoading(true);
      
      // Determine error type and message
      const error = determineErrorInfo();
      setErrorInfo(error);

      // If we have an order ID, try to get order details
      if (orderId) {
        await fetchOrderDetails();
      }

    } catch (error) {
      console.error('Error initializing payment error page:', error);
      setErrorInfo({
        type: 'system_error',
        message: 'Terjadi kesalahan sistem',
        suggestion: 'Silakan hubungi customer service untuk bantuan'
      });
    } finally {
      setLoading(false);
    }
  };

  const determineErrorInfo = (): ErrorInfo => {
    // Check transaction status first
    if (transactionStatus) {
      switch (transactionStatus) {
        case 'deny':
          return {
            type: 'payment_failed',
            message: 'Pembayaran Ditolak',
            orderId: orderId || undefined,
            errorCode: errorCode || undefined,
            suggestion: 'Pembayaran Anda ditolak oleh bank atau penyedia pembayaran. Silakan coba dengan kartu/rekening lain atau metode pembayaran berbeda.'
          };
        case 'cancel':
          return {
            type: 'payment_cancelled',
            message: 'Pembayaran Dibatalkan',
            orderId: orderId || undefined,
            suggestion: 'Anda membatalkan proses pembayaran. Silakan coba lagi atau gunakan metode pembayaran lain.'
          };
        case 'expire':
          return {
            type: 'payment_expired',
            message: 'Pembayaran Kedaluwarsa',
            orderId: orderId || undefined,
            suggestion: 'Waktu pembayaran telah habis. Silakan buat pesanan baru dan selesaikan pembayaran tepat waktu.'
          };
        case 'failure':
          return {
            type: 'payment_failed',
            message: 'Pembayaran Gagal',
            orderId: orderId || undefined,
            errorCode: errorCode || undefined,
            suggestion: 'Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi atau hubungi customer service.'
          };
      }
    }

    // Check error type parameter
    if (errorType) {
      switch (errorType) {
        case 'network':
          return {
            type: 'network_error',
            message: 'Koneksi Bermasalah',
            suggestion: 'Terjadi masalah koneksi internet. Silakan periksa koneksi Anda dan coba lagi.'
          };
        case 'timeout':
          return {
            type: 'payment_expired',
            message: 'Waktu Habis',
            suggestion: 'Proses pembayaran memakan waktu terlalu lama. Silakan coba lagi dengan koneksi yang lebih stabil.'
          };
        case 'system':
          return {
            type: 'system_error',
            message: 'Kesalahan Sistem',
            suggestion: 'Terjadi gangguan sistem sementara. Silakan coba lagi dalam beberapa menit.'
          };
      }
    }

    // Default error
    return {
      type: 'unknown',
      message: 'Terjadi Kesalahan',
      errorCode: errorCode || undefined,
      suggestion: 'Terjadi kesalahan yang tidak diketahui. Silakan hubungi customer service untuk bantuan.'
    };
  };

  const fetchOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderId)
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching order:', error);
        return;
      }

      setOrderDetails(data);
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(price);
  };

  const getErrorIcon = () => {
    switch (errorInfo?.type) {
      case 'payment_expired':
        return <Clock className="w-8 h-8 text-orange-600" />;
      case 'payment_cancelled':
        return <XCircle className="w-8 h-8 text-gray-600" />;
      case 'network_error':
        return <RefreshCw className="w-8 h-8 text-blue-600" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-red-600" />;
    }
  };

  const getErrorColor = () => {
    switch (errorInfo?.type) {
      case 'payment_expired':
        return 'orange';
      case 'payment_cancelled':
        return 'gray';
      case 'network_error':
        return 'blue';
      default:
        return 'red';
    }
  };

  const handleRetryPayment = () => {
    if (orderDetails) {
      // Navigate back to checkout with the same order data
      navigate('/checkout');
    } else {
      // Navigate to cart to try again
      navigate('/cart');
    }
  };

  const handleContactSupport = () => {
    // You can implement this to open a support chat or redirect to contact page
    toast.info('Fitur hubungi customer service akan segera tersedia');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuat informasi error...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const errorColor = getErrorColor();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className={`mx-auto w-16 h-16 bg-${errorColor}-100 rounded-full flex items-center justify-center mb-4`}>
                {getErrorIcon()}
              </div>
              <CardTitle className="text-2xl">{errorInfo?.message}</CardTitle>
              <p className="text-muted-foreground">{errorInfo?.suggestion}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Error Details */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h3 className="font-semibold mb-2">Detail Error</h3>
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="text-muted-foreground">Jenis Error:</span>
                      <p className="font-medium capitalize">{errorInfo?.type.replace('_', ' ')}</p>
                    </div>
                    {errorInfo?.errorCode && (
                      <div>
                        <span className="text-muted-foreground">Kode Error:</span>
                        <p className="font-medium font-mono">{errorInfo.errorCode}</p>
                      </div>
                    )}
                    {orderId && (
                      <div>
                        <span className="text-muted-foreground">Order ID:</span>
                        <p className="font-medium font-mono">{orderId}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Waktu:</span>
                      <p className="font-medium">{new Date().toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                </div>

                {/* Order Details if available */}
                {orderDetails && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Detail Pesanan</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Nomor Pesanan:</span>
                        <p className="font-medium">{orderDetails.order_number}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <p className="font-medium">{formatPrice(orderDetails.total)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <p className="font-medium capitalize">{orderDetails.status}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pengiriman:</span>
                        <p className="font-medium capitalize">{orderDetails.shipping_method}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Troubleshooting Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">Tips Mengatasi Masalah</h3>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Pastikan koneksi internet Anda stabil</li>
                    <li>• Periksa saldo atau limit kartu/rekening Anda</li>
                    <li>• Coba gunakan metode pembayaran yang berbeda</li>
                    <li>• Pastikan data pembayaran yang dimasukkan benar</li>
                    <li>• Jika masalah berlanjut, hubungi customer service</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <Button onClick={handleRetryPayment} className="w-full">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Coba Lagi
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/cart')} className="w-full">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Kembali ke Keranjang
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" onClick={handleContactSupport} className="w-full">
                      <Phone className="w-4 h-4 mr-2" />
                      Hubungi Support
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                      <Home className="w-4 h-4 mr-2" />
                      Kembali ke Beranda
                    </Button>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="border-t pt-4">
                  <div className="text-center text-sm text-muted-foreground">
                    <p className="mb-2">Butuh bantuan? Hubungi customer service kami:</p>
                    <div className="flex justify-center space-x-4">
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-1" />
                        <span>+62 123 456 7890</span>
                      </div>
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-1" />
                        <span>support@clothly.com</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs">
                      Layanan 24/7 • Respon dalam 1 jam
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PaymentError;