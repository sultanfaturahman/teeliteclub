import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, AlertTriangle, Package, ArrowRight, Home, RefreshCw, Loader2, Ban } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { cancelUserOrder } from "@/utils/orderActions";

interface PaymentStatus {
  order_id: string;
  transaction_status: string;
  payment_type?: string;
  gross_amount?: string;
  transaction_time?: string;
  fraud_status?: string;
  status_code?: string;
}

interface OrderDetails {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  nama_pembeli: string;
  email_pembeli: string;
  telepon_pembeli: string;
  shipping_address: string;
  shipping_method: string;
  payment_method: string;
}

const FinishPayment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // URL parameters (defined before state usage to avoid TDZ issues)
  const orderId = searchParams.get('order_id');
  const transactionStatus = searchParams.get('transaction_status');
  const statusCode = searchParams.get('status_code');

  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [activeMidtransOrderId, setActiveMidtransOrderId] = useState<string | null>(orderId);

  useEffect(() => {
    if (orderId) {
      setActiveMidtransOrderId(orderId);
    }
  }, [orderId]);

  useEffect(() => {
    console.log('FinishPayment useEffect - URL params:', {
      orderId,
      transactionStatus,
      statusCode,
      user: user?.id
    });
    
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!orderId) {
      setError('Order ID tidak ditemukan');
      setLoading(false);
      return;
    }

    checkPaymentStatus();
  }, [user, orderId]);

  const checkPaymentStatus = async () => {
    try {
      setLoading(true);
      
      // First, try to use URL parameters if available (for immediate feedback)
      if (transactionStatus && orderId) {
        console.log('Using URL parameters for payment status:', { transactionStatus, orderId, statusCode });
        
        // Create payment status from URL parameters
        const urlPaymentStatus = {
          order_id: orderId,
          transaction_status: transactionStatus,
          status_code: statusCode,
          transaction_time: new Date().toISOString()
        };
        
        setPaymentStatus(urlPaymentStatus);
        
        // Get order details from database
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('order_number', orderId)
          .eq('user_id', user?.id)
          .single();
        
        if (!orderError && orderData) {
          setOrderDetails(orderData);
        }
        
        // Show appropriate toast based on status
        if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
          toast.success('Pembayaran berhasil dikonfirmasi!');
        } else if (transactionStatus === 'pending') {
          toast.info('Pembayaran sedang diproses, silakan tunggu konfirmasi.');
        } else if (['deny', 'cancel', 'expire', 'failure'].includes(transactionStatus)) {
          toast.error('Pembayaran gagal atau dibatalkan.');
        }
        
        // Also verify with backend immediately to update order status
        await verifyWithBackend();
        
        setLoading(false);
        return;
      }
      
      // Fallback to backend verification
      await verifyWithBackend();
      
    } catch (error) {
      console.error('Error checking payment status:', error);
      setError('Gagal memeriksa status pembayaran');
      toast.error('Gagal memeriksa status pembayaran');
      setLoading(false);
    }
  };
  
  const verifyWithBackend = async (options?: { forceRefresh?: boolean; midtransOrderId?: string | null }) => {
    try {
      console.log('Verifying payment status with backend...');
      if (!orderId) {
        throw new Error('Order ID tidak ditemukan');
      }
      
      // Check payment status via backend function
      const payload: Record<string, string | null> = {
        order_id: orderId
      };

      const midtransOrderId = options?.midtransOrderId ?? activeMidtransOrderId;
      if (midtransOrderId) {
        payload.midtrans_order_id = midtransOrderId;
      }

      if (!options?.forceRefresh && transactionStatus) {
        payload.transaction_status = transactionStatus;
        if (statusCode) {
          payload.status_code = statusCode;
        }
      }

      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: payload
      });

      if (error) {
        console.error('Payment status check error:', error);
        // Don't throw error here if we already have status from URL
        if (!paymentStatus) {
          throw error;
        }
        return;
      }

      console.log('Backend payment verification result:', data);
      
      // Update with backend data if available
      if (data.payment_status) {
        setPaymentStatus(data.payment_status);
      }
      
      if (data.order) {
        setOrderDetails(data.order);
      }

    } catch (error) {
      console.error('Backend verification failed:', error);
      // Only show error if we don't have any payment status
      if (!paymentStatus) {
        setError('Gagal memverifikasi status pembayaran dengan server');
      }
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(price);
  };

  const getStatusIcon = () => {
    if (!paymentStatus) return <AlertTriangle className="w-8 h-8 text-yellow-600" />;
    
    switch (paymentStatus.transaction_status) {
      case 'settlement':
      case 'capture':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'pending':
      case 'challenge':
        return <Clock className="w-8 h-8 text-blue-600" />;
      case 'deny':
      case 'cancel':
      case 'expire':
      case 'failure':
        return <XCircle className="w-8 h-8 text-red-600" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-yellow-600" />;
    }
  };

  const getStatusColor = () => {
    if (!paymentStatus) return 'yellow';
    
    switch (paymentStatus.transaction_status) {
      case 'settlement':
      case 'capture':
        return 'green';
      case 'pending':
      case 'challenge':
        return 'blue';
      case 'deny':
      case 'cancel':
      case 'expire':
      case 'failure':
        return 'red';
      default:
        return 'yellow';
    }
  };

  const getStatusTitle = () => {
    console.log('getStatusTitle - paymentStatus:', paymentStatus);
    
    if (!paymentStatus) return 'Status Pembayaran Tidak Diketahui';
    
    console.log('getStatusTitle - transaction_status:', paymentStatus.transaction_status);
    
    switch (paymentStatus.transaction_status) {
      case 'settlement':
      case 'capture':
        return 'Pembayaran Berhasil!';
      case 'pending':
        return 'Pembayaran Sedang Diproses';
      case 'challenge':
        return 'Pembayaran Perlu Verifikasi';
      case 'deny':
        return 'Pembayaran Ditolak';
      case 'cancel':
        return 'Pembayaran Dibatalkan';
      case 'expire':
        return 'Pembayaran Kedaluwarsa';
      case 'failure':
        return 'Pembayaran Gagal';
      default:
        console.log('getStatusTitle - unknown status:', paymentStatus.transaction_status);
        return `Status: ${paymentStatus.transaction_status || 'Tidak Diketahui'}`;
    }
  };

  const getStatusMessage = () => {
    if (!paymentStatus) return 'Tidak dapat menentukan status pembayaran.';
    
    switch (paymentStatus.transaction_status) {
      case 'settlement':
      case 'capture':
        return 'Terima kasih! Pembayaran Anda telah berhasil dikonfirmasi. Pesanan Anda akan segera diproses.';
      case 'pending':
        return 'Pembayaran Anda sedang dalam proses verifikasi. Kami akan mengupdate status pesanan setelah pembayaran dikonfirmasi.';
      case 'challenge':
        return 'Pembayaran memerlukan verifikasi tambahan. Silakan menunggu konfirmasi dari penyedia pembayaran atau coba gunakan metode lain.';
      case 'deny':
        return 'Pembayaran Anda ditolak oleh bank atau penyedia pembayaran. Silakan coba metode pembayaran lain.';
      case 'cancel':
        return 'Pembayaran dibatalkan. Anda dapat mencoba melakukan pembayaran lagi atau menggunakan metode pembayaran lain.';
      case 'expire':
        return 'Waktu pembayaran telah habis. Silakan buat pesanan baru dan selesaikan pembayaran dalam waktu yang ditentukan.';
      case 'failure':
        return 'Pembayaran gagal diproses. Silakan coba lagi atau hubungi customer service untuk bantuan.';
      default:
        return 'Status pembayaran tidak dapat ditentukan. Silakan hubungi customer service untuk bantuan.';
    }
  };

  const handleCancelOrder = async () => {
    if (!orderDetails) {
      toast.error('Data pesanan belum lengkap.');
      return;
    }

    const confirmed = window.confirm('Batalkan pesanan ini? Anda dapat membuat pesanan baru untuk memilih metode pembayaran lain.');
    if (!confirmed) {
      return;
    }

    try {
      setCancelLoading(true);
      await cancelUserOrder(orderDetails.id, user?.id || undefined);
      toast.success('Pesanan dibatalkan. Silakan buat pesanan baru untuk memilih metode pembayaran lain.');
      navigate('/shop');
    } catch (cancelError) {
      console.error('Error cancelling order:', cancelError);
      toast.error(cancelError instanceof Error ? cancelError.message : 'Gagal membatalkan pesanan.');
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memverifikasi status pembayaran...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <CardTitle className="text-2xl">Terjadi Kesalahan</CardTitle>
                <p className="text-muted-foreground">{error}</p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button onClick={() => navigate('/')} className="flex-1">
                    <Home className="w-4 h-4 mr-2" />
                    Kembali ke Beranda
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/orders')} className="flex-1">
                    <Package className="w-4 h-4 mr-2" />
                    Lihat Pesanan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const statusColor = getStatusColor();
  const isSuccess = statusColor === 'green';
  const isPending = statusColor === 'blue';
  const isFailed = statusColor === 'red';
  const isPendingOrChallenge = Boolean(paymentStatus && (paymentStatus.transaction_status === 'pending' || paymentStatus.transaction_status === 'challenge'));
  const amountMatches = paymentStatus?.gross_amount
    ? Math.round(Number(paymentStatus.gross_amount)) === Math.round(orderDetails?.total ?? Number.NaN)
    : true;
  const orderNotSettled = Boolean(orderDetails && !['paid', 'shipped', 'delivered'].includes(orderDetails.status));
  const canCancelOrder = Boolean(orderNotSettled);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className={`mx-auto w-16 h-16 bg-${statusColor}-100 rounded-full flex items-center justify-center mb-4`}>
                {getStatusIcon()}
              </div>
              <CardTitle className="text-2xl">{getStatusTitle()}</CardTitle>
              <p className="text-muted-foreground">{getStatusMessage()}</p>
            </CardHeader>
            <CardContent>
              {orderDetails && (
                <div className="space-y-6">
                  {/* Order Details */}
                  <div className="border rounded-lg p-4 bg-muted/50">
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
                        <span className="text-muted-foreground">Status Pesanan:</span>
                        <p className="font-medium capitalize">{orderDetails.status}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Metode Pengiriman:</span>
                        <p className="font-medium capitalize">{orderDetails.shipping_method}</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  {paymentStatus && (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <h3 className="font-semibold mb-2">Detail Pembayaran</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Status Transaksi:</span>
                          <p className="font-medium capitalize">{paymentStatus.transaction_status}</p>
                        </div>
                        {paymentStatus.payment_type && (
                          <div>
                            <span className="text-muted-foreground">Metode Pembayaran:</span>
                            <p className="font-medium capitalize">{paymentStatus.payment_type}</p>
                          </div>
                        )}
                        {paymentStatus.gross_amount && (
                          <div>
                            <span className="text-muted-foreground">Jumlah:</span>
                            <p className="font-medium">{formatPrice(Number(paymentStatus.gross_amount))}</p>
                          </div>
                        )}
                        {paymentStatus.transaction_time && (
                          <div>
                            <span className="text-muted-foreground">Waktu Transaksi:</span>
                            <p className="font-medium">{new Date(paymentStatus.transaction_time).toLocaleString('id-ID')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Shipping Information */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Informasi Pengiriman</h3>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Nama:</span> {orderDetails.nama_pembeli}</p>
                      <p><span className="text-muted-foreground">Email:</span> {orderDetails.email_pembeli}</p>
                      <p><span className="text-muted-foreground">Telepon:</span> {orderDetails.telepon_pembeli}</p>
                      <p><span className="text-muted-foreground">Alamat:</span> {orderDetails.shipping_address}</p>
                    </div>
                  </div>

                  {/* Status-specific information */}
                  {isSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <Package className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-green-800">Langkah Selanjutnya</h3>
                      </div>
                      <p className="text-green-700 text-sm mt-2">
                        Pesanan Anda akan diproses dalam 1-2 hari kerja. Anda akan menerima email konfirmasi 
                        beserta nomor resi pengiriman setelah pesanan dikirim.
                      </p>
                    </div>
                  )}

                  {isPending && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-800">Menunggu Konfirmasi</h3>
                      </div>
                      <p className="text-blue-700 text-sm mt-2">
                        Pembayaran Anda sedang diverifikasi. Proses ini biasanya memakan waktu beberapa menit hingga 24 jam. 
                        Kami akan mengirimkan notifikasi email setelah pembayaran dikonfirmasi.
                      </p>
                      <p className="text-xs text-blue-700 mt-2">
                        Bila ingin mengganti metode pembayaran, batalkan pesanan ini terlebih dahulu lalu lakukan checkout ulang.
                      </p>
                    </div>
                  )}

                  {isFailed && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <h3 className="font-semibold text-red-800">Perlu Tindakan</h3>
                      </div>
                      <p className="text-red-700 text-sm mt-2">
                        Silakan hubungi customer service kami jika Anda memerlukan bantuan atau ingin mencoba metode pembayaran lain.
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {isSuccess && (
                      <>
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
                        <Button variant="outline" onClick={() => checkPaymentStatus()} className="w-full" size="sm">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Refresh Status Order
                        </Button>
                      </>
                    )}
                    
                    {isPending && (
                      <>
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                          {canCancelOrder && (
                            <Button
                              onClick={handleCancelOrder}
                              className="flex-1"
                              variant="destructive"
                              disabled={cancelLoading}
                            >
                              {cancelLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Membatalkan Pesanan...
                                </>
                              ) : (
                                <>
                                  <Ban className="w-4 h-4 mr-2" />
                                  Batal & Order Ulang
                                </>
                              )}
                            </Button>
                          )}
                          <Button onClick={() => navigate('/orders')} className="flex-1">
                            <Package className="w-4 h-4 mr-2" />
                            Pantau Status Pesanan
                          </Button>
                          <Button variant="outline" onClick={() => checkPaymentStatus()} className="flex-1">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh Status
                          </Button>
                        </div>
                        {canCancelOrder && (
                          <p className="text-xs text-muted-foreground">
                            Ingin menggunakan metode pembayaran berbeda? Batalkan pesanan terlebih dahulu, lalu buat pesanan baru saat checkout.
                          </p>
                        )}
                      </>
                    )}
                    
                    {isFailed && (
                      <div className="flex gap-4">
                        <Button onClick={() => navigate('/cart')} className="flex-1">
                          Coba Pembayaran Lain
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
                          <Home className="w-4 h-4 mr-2" />
                          Kembali ke Beranda
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default FinishPayment;
