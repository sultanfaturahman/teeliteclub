import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  Calendar,
  Eye,
  Settings
} from "lucide-react";
import { Link } from "react-router-dom";
import { HeroSettings } from "@/components/admin/HeroSettings";
import { MaintenanceSettings } from "@/components/admin/MaintenanceSettings";
import { DashboardSkeleton } from "@/components/loading/PageSkeleton";

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  todayOrders: number;
  pendingOrders: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  nama_pembeli: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    todayOrders: 0,
    pendingOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load stats
      const [productsResult, ordersResult, usersResult] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact' }),
        supabase.from('orders').select('total, status, created_at', { count: 'exact' }),
        supabase.from('profiles').select('*', { count: 'exact' })
      ]);

      const totalProducts = productsResult.count || 0;
      const totalUsers = usersResult.count || 0;
      const orders = ordersResult.data || [];
      const totalOrders = ordersResult.count || 0;

      // Calculate revenue and today's orders
      const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = orders.filter(order => 
        order.created_at?.startsWith(today)
      ).length;
      const pendingOrders = orders.filter(order => order.status === 'pending').length;

      setStats({
        totalProducts,
        totalOrders,
        totalUsers,
        totalRevenue,
        todayOrders,
        pendingOrders
      });

      // Load recent orders
      const { data: recentOrdersData } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentOrders(recentOrdersData || []);
    } catch (error) {
      logger.error('Failed to load dashboard data', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Menunggu', variant: 'secondary' as const },
      paid: { label: 'Dibayar', variant: 'default' as const },
      processing: { label: 'Diproses', variant: 'default' as const },
      shipped: { label: 'Dikirim', variant: 'default' as const },
      delivered: { label: 'Selesai', variant: 'default' as const },
      cancelled: { label: 'Dibatalkan', variant: 'destructive' as const },
      failed: { label: 'Gagal', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <DashboardSkeleton />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button onClick={loadDashboardData} variant="outline">
            Refresh Data
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pesanan</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingOrders} menunggu pembayaran
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.todayOrders} pesanan hari ini
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Pesanan Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.nama_pembeli || 'Guest'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-medium">{formatPrice(order.total)}</p>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Belum ada pesanan
                  </p>
                )}
              </div>
              {recentOrders.length > 0 && (
                <div className="mt-4">
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/admin/orders">
                      <Eye className="h-4 w-4 mr-2" />
                      Lihat Semua Pesanan
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button className="w-full justify-start" asChild>
                  <Link to="/admin/products/new">
                    <Package className="h-4 w-4 mr-2" />
                    Tambah Produk Baru
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/orders">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Kelola Pesanan
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/users">
                    <Users className="h-4 w-4 mr-2" />
                    Lihat Pengguna
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/reports">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Laporan Penjualan
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <div className="grid gap-4 md:grid-cols-2">
          <HeroSettings />
          <MaintenanceSettings />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;