import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Package, Truck, CheckCircle, Clock, AlertCircle, User, MapPin, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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
  shipping_method: string;
  shipping_address: string;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const { toast } = useToast();

  console.log('OrderDetail - User and profile info:', {
    userId: user?.id,
    userEmail: user?.email,
    profileRole: profile?.role,
    orderId: id
  });

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
    { value: "failed", label: "Failed" }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "processing": return <Package className="h-4 w-4" />;
      case "shipped": return <Truck className="h-4 w-4" />;
      case "delivered": return <CheckCircle className="h-4 w-4" />;
      case "cancelled": return <AlertCircle className="h-4 w-4" />;
      case "failed": return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "shipped": return "bg-purple-100 text-purple-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const loadOrderDetail = async () => {
    if (!id) {
      console.error("No order ID provided");
      navigate("/admin/orders");
      return;
    }

    console.log("Loading order detail for ID:", id);

    try {
      setLoading(true);
      
      // Load order details
      console.log("Fetching order data...");
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();

      if (orderError) {
        console.error("Order fetch error:", orderError);
        throw orderError;
      }

      console.log("Order data loaded:", orderData);
      setOrder(orderData);

      // Load order items with product details
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
        const productIds = [...new Set(simpleItemsData?.map(item => item.product_id))];
        
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

      console.log("Final order items data:", itemsData);
      setOrderItems(itemsData || []);

    } catch (error) {
      console.error("Error loading order detail:", error);
      
      // More specific error handling
      if (error.code === 'PGRST116') {
        toast({
          title: "Order Not Found",
          description: "The requested order could not be found.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to load order details: ${error.message || 'Unknown error'}`,
          variant: "destructive",
        });
      }
      
      navigate("/admin/orders");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    if (!order) return;

    // If changing to shipped status, show tracking dialog
    if (newStatus === "shipped") {
      setShowTrackingDialog(true);
      return;
    }

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", order.id);

      if (error) throw error;

      setOrder({ ...order, status: newStatus });
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });

    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const updateOrderWithTracking = async () => {
    if (!order || !trackingNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tracking number",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: "shipped", 
          tracking_number: trackingNumber.trim(),
          updated_at: new Date().toISOString() 
        })
        .eq("id", order.id);

      if (error) throw error;

      setOrder({ ...order, status: "shipped", tracking_number: trackingNumber.trim() });
      setShowTrackingDialog(false);
      setTrackingNumber("");
      toast({
        title: "Success",
        description: "Order status updated to shipped with tracking number",
      });

    } catch (error) {
      console.error("Error updating order with tracking:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

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
    return orderItems.reduce((total, item) => total + (item.harga * item.jumlah), 0);
  };

  useEffect(() => {
    loadOrderDetail();
  }, [id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-4">Order not found</h2>
          <div className="mb-6 p-4 bg-gray-100 rounded text-sm text-left max-w-md mx-auto">
            <h3 className="font-semibold mb-2">Debug Info:</h3>
            <p><strong>Order ID:</strong> {id || 'Not provided'}</p>
            <p><strong>User ID:</strong> {user?.id || 'Not logged in'}</p>
            <p><strong>User Email:</strong> {user?.email || 'Not available'}</p>
            <p><strong>User Role:</strong> {profile?.role || 'Not loaded'}</p>
            <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
          </div>
          <Button onClick={() => navigate("/admin/orders")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin/orders")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Order Details</h1>
              <p className="text-muted-foreground">Order #{order.order_number}</p>
            </div>
          </div>
          <Badge className={`${getStatusColor(order.status)} flex items-center gap-2 text-sm px-3 py-1`}>
            {getStatusIcon(order.status)}
            {order.status.toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Items ({orderItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                        <img
                          src={getProductImage(item)}
                          alt={item.product?.name || "Product"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.product?.name || "Unknown Product"}</h4>
                        <p className="text-sm text-muted-foreground">
                          Size: {item.ukuran} • Quantity: {item.jumlah}
                        </p>
                        <p className="text-sm font-medium">{formatPrice(item.harga)} each</p>
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
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(calculateSubTotal())}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping ({order.shipping_method})</span>
                  <span>{calculateShippingFee() > 0 ? formatPrice(calculateShippingFee()) : "Free"}</span>
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
            {/* Status Update */}
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={order.status} onValueChange={updateOrderStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border shadow-md z-50">
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Display tracking number if exists */}
                {order.tracking_number && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <Label className="text-sm font-medium">Tracking Number</Label>
                    <p className="text-sm font-mono">{order.tracking_number}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{order.nama_pembeli}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{order.email_pembeli}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{order.telepon_pembeli}</p>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{order.shipping_address}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Method</p>
                  <p className="font-medium capitalize">{order.shipping_method}</p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Method</p>
                  <p className="font-medium capitalize">{order.payment_method}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">{formatDate(order.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{formatDate(order.updated_at)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tracking Number Dialog */}
        <Dialog open={showTrackingDialog} onOpenChange={setShowTrackingDialog}>
          <DialogContent className="bg-background border border-border">
            <DialogHeader>
              <DialogTitle>Add Tracking Number</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tracking-number">Tracking Number</Label>
                <Input
                  id="tracking-number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowTrackingDialog(false);
                    setTrackingNumber("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={updateOrderWithTracking}>
                  Update to Shipped
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default OrderDetail;