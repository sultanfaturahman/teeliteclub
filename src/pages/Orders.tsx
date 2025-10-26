import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Package,
  Calendar,
  CreditCard,
  Truck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  ExternalLink,
  MapPin
} from "lucide-react";
import { toast } from "sonner";
import { Footer } from "@/components/layout/Footer";
import { OrdersSkeleton } from "@/components/loading/OrdersSkeleton";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  product_id: string;
  jumlah: number;
  harga: number;
  ukuran: string;
  product?: {
    name: string;
    image_url?: string;
  };
}

interface Order {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  nama_pembeli: string;
  email_pembeli: string;
  telepon_pembeli: string;
  shipping_address: string;
  payment_method: string;
  payment_url?: string;
  shipping_method: string;
  tracking_number?: string;
  order_items: OrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: {
    label: 'Menunggu Pembayaran',
    className: 'bg-amber-100 text-amber-800 border border-amber-200'
  },
  paid: {
    label: 'Dibayar',
    className: 'bg-emerald-100 text-emerald-700 border border-emerald-200'
  },
  processing: {
    label: 'Diproses',
    className: 'bg-sky-100 text-sky-700 border border-sky-200'
  },
  shipped: {
    label: 'Dikirim',
    className: 'bg-indigo-100 text-indigo-700 border border-indigo-200'
  },
  delivered: {
    label: 'Selesai',
    className: 'bg-emerald-600 text-white'
  },
  cancelled: {
    label: 'Dibatalkan',
    className: 'bg-rose-100 text-rose-700 border border-rose-200'
  },
  failed: {
    label: 'Gagal',
    className: 'bg-rose-100 text-rose-700 border border-rose-200'
  }
};

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  console.log('Orders page - user:', user?.id, 'email:', user?.email);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] ?? {
      label: status,
      className: 'bg-muted text-foreground'
    };

    return (
      <Badge
        className={cn(
          "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
          config.className
        )}
      >
        {config.label}
      </Badge>
    );
  };

  const toggleOrderDetails = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const handleContinuePayment = async (paymentUrl: string | null, orderNumber: string, orderId: string) => {
    if (!paymentUrl) {
      // Try to recover payment URL for legacy orders
      console.log('Payment URL missing, attempting recovery for order:', orderId);

      try {
        const { data, error } = await supabase.functions.invoke('recover-payment-url', {
          body: { order_id: orderId }
        });

        if (error) {
          console.error('Failed to recover payment URL:', error);
          toast.error('Tidak dapat memulihkan link pembayaran');
          return;
        }

        if (data?.payment_url) {
          console.log('Payment URL recovered:', data.payment_url);
          // Open the recovered payment URL
          window.open(data.payment_url, '_blank', 'noopener,noreferrer');
          toast.success('Link pembayaran dipulihkan dan dibuka di tab baru');
          // Refresh orders to update the UI
          fetchOrders();
          return;
        }
      } catch (recoveryError) {
        console.error('Payment URL recovery failed:', recoveryError);
      }

      toast.error('Link pembayaran tidak tersedia');
      return;
    }

    console.log('Continuing payment for order:', orderNumber);
    console.log('Payment URL:', paymentUrl);

    // Open payment URL in new tab
    window.open(paymentUrl, '_blank', 'noopener,noreferrer');

    toast.success('Halaman pembayaran dibuka di tab baru');

    // Refresh orders after a short delay to check for payment updates
    setTimeout(() => {
      console.log('Auto-refreshing orders after payment continuation');
      fetchOrders();
    }, 2000);
  };

  useEffect(() => {
    console.log('Orders useEffect - user:', user);
    if (!user) {
      console.log('No user found, redirecting to auth');
      navigate('/auth');
      return;
    }
    console.log('User found, fetching orders');
    fetchOrders();
  }, [user, navigate]);

  // Add an effect to refresh orders when the page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        console.log('Page became visible, refreshing orders');
        fetchOrders();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        console.error('No user ID available for fetching orders');
        toast.error('User not authenticated');
        return;
      }

      console.log('Fetching orders for user ID:', user.id);

      // OPTIMIZED: Single query with relationships (fixed duplicate constraints)
      console.log('Orders fetchOrders - Using optimized single query...');

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id, order_number, total, status, created_at, updated_at,
          payment_url, payment_method, shipping_method, tracking_number,
          nama_pembeli, email_pembeli, telepon_pembeli, shipping_address,
          order_items (
            id, jumlah, harga, ukuran,
            products (
              id, name, image_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (ordersError) {
        console.error('Orders fetchOrders - Supabase error:', ordersError);
        toast.error('Failed to load orders');
        return;
      }

      if (!ordersData || ordersData.length === 0) {
        console.log('Orders fetchOrders - No orders found for user');
        setOrders([]);
        return;
      }

      // Transform the data to match expected structure
      const transformedOrders = ordersData.map(order => ({
        ...order,
        order_items: order.order_items?.map(item => ({
          ...item,
          product: item.products
        })) || []
      }));

      console.log(`Orders fetchOrders - Successfully loaded ${transformedOrders.length} orders with items in single query`);
      setOrders(transformedOrders);

    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Gagal memuat riwayat pesanan');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Beranda
          </Button>
          <OrdersSkeleton />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto max-w-5xl px-4 py-10 sm:py-12">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Button>
        </div>

        <section className="mb-10 rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm backdrop-blur sm:rounded-3xl sm:p-6 md:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xs font-semibold uppercase tracking-[0.3em]">
                History Orders
              </h1>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                variant="outline"
                onClick={fetchOrders}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full border-border/80 sm:w-auto"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/shop')}
                className="flex w-full items-center justify-center gap-2 rounded-full sm:w-auto bg-black text-white"
              >
                <Package className="h-4 w-4" />
                Shop more
              </Button>
            </div>
          </div>
        </section>

        {orders.length === 0 ? (
          <Card className="overflow-hidden rounded-2xl border border-dashed border-border/70 bg-muted/20 shadow-sm sm:rounded-3xl">
            <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center sm:py-16">
              <div className="rounded-full bg-muted p-4 text-muted-foreground">
                <Package className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground sm:text-2xl">Belum ada pesanan</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Saat Anda melakukan pembelian, status dan detail pengirimannya akan muncul di sini.
                </p>
              </div>
              <Button onClick={() => navigate('/shop')} className="w-full rounded-full px-6 sm:w-auto">
                Mulai Belanja
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden rounded-2xl border border-border/60 shadow-sm sm:rounded-3xl">
                <CardHeader className="space-y-4 border-b border-border/60 bg-muted/30 px-5 py-5 sm:px-6 sm:py-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                        Pesanan
                      </p>
                      <CardTitle className="text-xl text-foreground sm:text-2xl">
                        #{order.order_number}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-xs sm:text-sm">
                          <Calendar className="h-4 w-4" />
                          {formatDate(order.created_at)}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-xs sm:text-sm">
                          <CreditCard className="h-4 w-4" />
                          <span className="capitalize">{order.payment_method}</span>
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-xs sm:text-sm">
                          <Truck className="h-4 w-4" />
                          {order.shipping_method === 'express' ? 'Express' : 'Reguler'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-3 text-left sm:items-end">
                      {getStatusBadge(order.status)}
                      <div className="text-xl font-semibold text-foreground sm:text-2xl">
                        {formatPrice(order.total)}
                      </div>
                      {order.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleContinuePayment(order.payment_url || null, order.order_number, order.id)}
                          className="flex w-full items-center justify-center gap-2 rounded-full px-4 sm:w-auto"
                          variant={order.payment_url ? "default" : "outline"}
                        >
                          <ExternalLink className="h-4 w-4" />
                          {order.payment_url ? 'Lanjutkan Pembayaran' : 'Pulihkan Pembayaran'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 px-5 py-6 sm:px-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:text-sm">
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {order.order_items.length} produk
                      </span>
                      {order.status === 'shipped' && order.tracking_number && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-700">
                          <Truck className="h-4 w-4" />
                          Resi: <span className="font-mono font-medium">{order.tracking_number}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="flex w-full items-center justify-center gap-2 rounded-full border-border/70 sm:w-auto"
                        >
                          <Eye className="h-4 w-4" />
                          Detail Lengkap
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleOrderDetails(order.id)}
                          className="flex w-full items-center justify-center gap-2 rounded-full px-4 sm:w-auto"
                        >
                          {expandedOrders.has(order.id) ? 'Sembunyikan Ringkasan' : 'Lihat Ringkasan'}
                          {expandedOrders.has(order.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {expandedOrders.has(order.id) && (
                      <div className="space-y-6">
                        <Separator />

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                            Produk yang dipesan
                          </h4>
                          <div className="space-y-3">
                            {order.order_items.map((item) => (
                              <div
                                key={item.id}
                                className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center"
                              >
                                {item.product?.image_url ? (
                                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-border/70 bg-background">
                                    <img
                                      src={item.product.image_url}
                                      alt={item.product.name}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-border/70 bg-background text-muted-foreground">
                                    <Package className="h-6 w-6" />
                                  </div>
                                )}
                                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="font-medium text-foreground">
                                      {item.product?.name || 'Produk tidak ditemukan'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Ukuran: {item.ukuran} • Qty: {item.jumlah}
                                    </p>
                                  </div>
                                  <div className="text-left sm:text-right">
                                    <p className="font-medium text-foreground">
                                      {formatPrice(item.harga * item.jumlah)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {formatPrice(item.harga)} × {item.jumlah}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Separator />

                        <div className="grid gap-6 md:grid-cols-2 text-sm">
                          <div className="rounded-2xl border border-border/60 bg-card/80 p-5">
                            <h5 className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                              Informasi Pembeli
                            </h5>
                            <div className="mt-3 space-y-2 text-foreground">
                              <p><span className="text-muted-foreground">Nama:</span> {order.nama_pembeli}</p>
                              <p><span className="text-muted-foreground">Email:</span> {order.email_pembeli}</p>
                              <p><span className="text-muted-foreground">Telepon:</span> {order.telepon_pembeli}</p>
                            </div>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-card/80 p-5">
                            <h5 className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                              Pengiriman & Pembayaran
                            </h5>
                            <div className="mt-3 space-y-3 text-foreground">
                              <div className="flex items-center gap-2 text-sm">
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                <span className="capitalize">{order.payment_method}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Truck className="h-4 w-4 text-muted-foreground" />
                                <span>{order.shipping_method === 'express' ? 'Express' : 'Reguler'}</span>
                              </div>
                              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                <span className="whitespace-pre-line text-foreground">{order.shipping_address}</span>
                              </div>

                              {order.status === 'shipped' && order.tracking_number && (
                                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 text-indigo-700">
                                  <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4" />
                                    <span className="font-semibold">Nomor Resi</span>
                                  </div>
                                  <p className="mt-2 font-mono text-sm font-medium">
                                    {order.tracking_number}
                                  </p>
                                  <p className="mt-1 text-xs text-indigo-600/80">
                                    Gunakan nomor resi ini untuk melacak paket Anda
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default Orders;
