import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, Calendar, CreditCard, Truck, MapPin, User, Clock, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Footer } from "@/components/layout/Footer";
import { OrderDetailSkeleton } from "@/components/loading/OrdersSkeleton";
import { toast as sonnerToast } from "sonner";

interface OrderItem {
  id: string;
  product_id: string;
  jumlah: number;
  harga: number;
  ukuran: string;
  product?: {
    name: string;
    image_url?: string;
    gambar?: string[];
  };
}

interface Order {
  id: string;
  order_number: string;
  nama_pembeli: string;
  email_pembeli: string;
  telepon_pembeli: string;
  total: number;
  status: string;
  payment_method: string;
  payment_url?: string;
  shipping_method: string;
  shipping_address: string;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  order_items: OrderItem[];
}

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  console.log('Customer OrderDetail - User info:', {
    userId: user?.id,
    userEmail: user?.email,
    orderId: id
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-2"><Clock className="h-3 w-3" />Menunggu Pembayaran</Badge>;
      case 'paid':
        return <Badge variant="default" className="flex items-center gap-2"><CheckCircle className="h-3 w-3" />Dibayar</Badge>;
      case 'processing':
        return <Badge variant="outline" className="flex items-center gap-2"><Package className="h-3 w-3" />Diproses</Badge>;
      case 'shipped':
        return <Badge variant="outline" className="flex items-center gap-2"><Truck className="h-3 w-3" />Dikirim</Badge>;
      case 'delivered':
        return <Badge variant="default" className="flex items-center gap-2"><CheckCircle className="h-3 w-3" />Selesai</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="flex items-center gap-2"><AlertCircle className="h-3 w-3" />Dibatalkan</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-2"><AlertCircle className="h-3 w-3" />Gagal</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getProductImage = (item: OrderItem) => {
    if (item.product?.gambar && item.product.gambar.length > 0) {
      return item.product.gambar[0];
    }
    if (item.product?.image_url) {
      return item.product.image_url;
    }
    return "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop";
  };

  const calculateShippingFee = () => {
    return order?.shipping_method === "express" ? 20000 : 0;
  };

  const calculateSubTotal = () => {
    return order?.order_items?.reduce((total, item) => total + (item.harga * item.jumlah), 0) || 0;
  };

  const handleContinuePayment = async () => {
    if (!order?.payment_url) {
      // Try to recover payment URL for legacy orders
      console.log('Payment URL missing, attempting recovery for order:', order.id);

      try {
        const { data, error } = await supabase.functions.invoke('recover-payment-url', {
          body: { order_id: order.id }
        });

        if (error) {
          console.error('Failed to recover payment URL:', error);
          toast({
            title: "Error",
            description: "Tidak dapat memulihkan link pembayaran. Silakan buat pesanan baru.",
            variant: "destructive",
          });
          return;
        }

        if (data?.payment_url) {
          console.log('Payment URL recovered:', data.payment_url);
          // Update local order state
          setOrder(prev => prev ? { ...prev, payment_url: data.payment_url } : null);
          // Open the recovered payment URL
          window.open(data.payment_url, '_blank', 'noopener,noreferrer');
          sonnerToast.success('Link pembayaran dipulihkan dan dibuka di tab baru');
          return;
        }
      } catch (recoveryError) {
        console.error('Payment URL recovery failed:', recoveryError);
      }

      toast({
        title: "Error",
        description: "Link pembayaran tidak tersedia",
        variant: "destructive",
      });
      return;
    }

    console.log('Continuing payment for order:', order.order_number);
    console.log('Payment URL:', order.payment_url);

    // Open payment URL in new tab
    window.open(order.payment_url, '_blank', 'noopener,noreferrer');

    sonnerToast.success('Halaman pembayaran dibuka di tab baru');
  };

  const loadOrderDetail = async () => {
    if (!id || !user?.id) {
      console.error("No order ID or user ID provided");
      navigate("/orders");
      return;
    }

    console.log("Loading customer order detail for ID:", id);

    try {
      setLoading(true);
      
      // Load order details first
      console.log("Fetching order data...");
      // Try to fetch with all fields, fallback if some fields don't exist
      let orderData, orderError;
      
      // First, try with all fields including payment_url
      console.log('OrderDetail loadOrderDetail - Attempting full query with all fields...');
      
      const fullResult = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id) // Ensure user can only access their own orders
        .single();
      
      // Check if the error is due to missing payment_url column
      if (fullResult.error && fullResult.error.code === '42703' && fullResult.error.message.includes('payment_url')) {
        console.warn("OrderDetail loadOrderDetail - payment_url column doesn't exist, using fallback query");
        const fallbackResult = await supabase
          .from("orders")
          .select("id, order_number, nama_pembeli, email_pembeli, telepon_pembeli, total, status, payment_method, shipping_method, shipping_address, tracking_number, created_at, updated_at, user_id")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();
        orderData = fallbackResult.data;
        orderError = fallbackResult.error;
        console.log('OrderDetail loadOrderDetail - Fallback query result:', { 
          dataExists: !!orderData, 
          error: orderError?.message 
        });
      } else {
        orderData = fullResult.data;
        orderError = fullResult.error;
        console.log('OrderDetail loadOrderDetail - Full query result:', { 
          dataExists: !!orderData, 
          error: orderError?.message 
        });
      }

      if (orderError) {
        console.error("Order fetch error:", orderError);
        throw orderError;
      }

      console.log("Order data loaded:", orderData);

      // Load order items with product details using the same approach as admin
      console.log("Fetching order items...");
      let itemsData = null;
      
      // Try the relationship query first
      try {
        const { data: relationshipData, error: relationshipError } = await supabase
          .from("order_items")
          .select(`
            *,
            product:products!order_items_product_id_fkey (
              name,
              image_url,
              gambar
            )
          `)
          .eq("order_id", id);

        if (relationshipError) {
          console.warn("Relationship query failed, trying fallback:", relationshipError);
          throw relationshipError;
        }

        itemsData = relationshipData;
        console.log("Order items loaded via relationship:", itemsData?.length || 0, "items");
      } catch (relationshipError) {
        console.log("Using fallback method to load order items and products separately...");
        
        // Fallback: Load order items first, then products separately
        const { data: simpleItemsData, error: simpleItemsError } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", id);

        if (simpleItemsError) {
          console.error("Simple order items fetch error:", simpleItemsError);
          throw simpleItemsError;
        }

        // Get unique product IDs
        const productIds = [...new Set(simpleItemsData?.map(item => item.product_id))] as string[];
        
        if (productIds.length > 0) {
          // Load products separately
          const { data: productsData, error: productsError } = await supabase
            .from("products")
            .select("id, name, image_url, gambar")
            .in("id", productIds);

          if (productsError) {
            console.error("Products fetch error:", productsError);
            throw productsError;
          }

          // Combine the data manually
          itemsData = simpleItemsData?.map(item => ({
            ...item,
            product: productsData?.find(product => product.id === item.product_id)
          }));
        } else {
          itemsData = simpleItemsData;
        }

        console.log("Order items loaded via fallback method:", itemsData?.length || 0, "items");
      }

      // Combine order data with items
      const completeOrderData = {
        ...orderData,
        order_items: itemsData || []
      };

      console.log("Final order data:", completeOrderData);
      console.log("Order status:", completeOrderData.status);
      console.log("Payment URL exists:", !!completeOrderData.payment_url);
      console.log("Payment URL value:", completeOrderData.payment_url);
      setOrder(completeOrderData);

    } catch (error) {
      console.error("Error loading order detail:", error);
      
      if (error.code === 'PGRST116') {
        toast({
          title: "Pesanan Tidak Ditemukan",
          description: "Pesanan yang diminta tidak dapat ditemukan atau Anda tidak memiliki akses.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: `Gagal memuat detail pesanan: ${error.message || 'Unknown error'}`,
          variant: "destructive",
        });
      }
      
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadOrderDetail();
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <OrderDetailSkeleton />
        </div>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Pesanan tidak ditemukan</h2>
            <Button onClick={() => navigate("/orders")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Riwayat Pesanan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/orders")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Detail Pesanan</h1>
                <p className="text-muted-foreground">Pesanan #{order.order_number}</p>
              </div>
            </div>
            {getStatusBadge(order.status)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Produk yang Dipesan ({order.order_items?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                          <img
                            src={getProductImage(item)}
                            alt={item.product?.name || "Product"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{item.product?.name || "Produk tidak ditemukan"}</h4>
                          <p className="text-sm text-muted-foreground">
                            Ukuran: {item.ukuran} • Jumlah: {item.jumlah}
                          </p>
                          <p className="text-sm font-medium">{formatPrice(item.harga)} per item</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatPrice(item.harga * item.jumlah)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Ringkasan Pesanan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatPrice(calculateSubTotal())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ongkos Kirim ({order.shipping_method === 'express' ? 'Express' : 'Reguler'})</span>
                    <span>{calculateShippingFee() > 0 ? formatPrice(calculateShippingFee()) : "Gratis"}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Sidebar */}
            <div className="space-y-6">
              {/* Order Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Status Pesanan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-center">
                    {getStatusBadge(order.status)}
                  </div>
                  
                  {/* Continue Payment Button for pending orders */}
                  {order.status === 'pending' && (
                    <div>
                      {order.payment_url ? (
                        <Button
                          onClick={handleContinuePayment}
                          className="w-full flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Lanjutkan Pembayaran
                        </Button>
                      ) : (
                        <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 space-y-3">
                          <p className="text-sm text-orange-700 dark:text-orange-300">
                            Link pembayaran tidak tersedia untuk pesanan lama.
                          </p>
                          <Button
                            onClick={handleContinuePayment}
                            className="w-full flex items-center gap-2"
                            variant="outline"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Pulihkan Link Pembayaran
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Tracking number if shipped */}
                  {order.status === 'shipped' && order.tracking_number && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-1">
                        <Truck className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-blue-600">Nomor Resi</span>
                      </div>
                      <p className="font-mono text-sm font-medium">{order.tracking_number}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Gunakan nomor resi ini untuk melacak paket Anda
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informasi Pembeli
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Nama</p>
                    <p className="font-medium">{order.nama_pembeli}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{order.email_pembeli}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telepon</p>
                    <p className="font-medium">{order.telepon_pembeli}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Informasi Pengiriman
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Alamat</p>
                    <p className="font-medium">{order.shipping_address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Metode</p>
                    <p className="font-medium capitalize">{order.shipping_method === 'express' ? 'Express' : 'Reguler'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Informasi Pembayaran
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Metode</p>
                    <p className="font-medium capitalize">{order.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tanggal Pesanan</p>
                    <p className="font-medium">{formatDate(order.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Terakhir Diperbarui</p>
                    <p className="font-medium">{formatDate(order.updated_at)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default OrderDetail;