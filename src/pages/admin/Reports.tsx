import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, TrendingUp, TrendingDown, DollarSign, Package, Users, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  total_products: number;
  total_value: number;
  low_stock_products: number;
  out_of_stock_products: number;
  total_categories: number;
  recent_products: number;
}

interface CategoryBreakdown {
  category: string;
  product_count: number;
  total_value: number;
}

interface RecentActivity {
  id: string;
  name: string;
  action: string;
  date: string;
}

interface SalesData {
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  completed_orders: number;
}

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("30");
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const { toast } = useToast();

  const timeOptions = [
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
    { value: "90", label: "Last 90 days" },
    { value: "365", label: "Last year" }
  ];

  const loadDashboardStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      if (error) throw error;
      setDashboardStats(data[0]);
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
    }
  };

  const loadCategoryBreakdown = async () => {
    try {
      const { data, error } = await supabase.rpc('get_category_breakdown');
      if (error) throw error;
      setCategoryBreakdown(data || []);
    } catch (error) {
      console.error("Error loading category breakdown:", error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const { data, error } = await supabase.rpc('get_recent_activity');
      if (error) throw error;
      setRecentActivity(data || []);
    } catch (error) {
      console.error("Error loading recent activity:", error);
    }
  };

  const loadSalesData = async () => {
    try {
      const daysBack = parseInt(timeFilter);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get orders data
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", startDate.toISOString());

      if (ordersError) throw ordersError;

      const totalOrders = ordersData?.length || 0;
      const totalRevenue = ordersData?.reduce((sum, order) => sum + parseFloat(String(order.total || 0)), 0) || 0;
      const pendingOrders = ordersData?.filter(order => order.status === "pending").length || 0;
      const completedOrders = ordersData?.filter(order => order.status === "delivered").length || 0;

      setSalesData({
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        pending_orders: pendingOrders,
        completed_orders: completedOrders
      });
    } catch (error) {
      console.error("Error loading sales data:", error);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadDashboardStats(),
      loadCategoryBreakdown(),
      loadRecentActivity(),
      loadSalesData()
    ]);
    setLoading(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const exportReport = () => {
    toast({
      title: "Export Started",
      description: "Report export will be available shortly",
    });
  };

  useEffect(() => {
    loadAllData();
  }, [timeFilter]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <div className="flex items-center gap-3">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportReport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Sales Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {salesData ? formatPrice(salesData.total_revenue) : "Loading..."}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +12% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {salesData?.total_orders || 0}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +8% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {salesData?.pending_orders || 0}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                -2% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {salesData?.completed_orders || 0}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +15% from last period
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardStats?.total_products || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <Package className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {dashboardStats?.low_stock_products || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <Package className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {dashboardStats?.out_of_stock_products || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryBreakdown.map((category) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{category.category}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {category.product_count} products
                      </span>
                    </div>
                    <div className="text-sm font-medium">
                      {formatPrice(category.total_value)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{activity.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {activity.action}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(activity.date)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Reports;