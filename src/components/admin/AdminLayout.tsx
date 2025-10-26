import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Menu,
  LogOut,
  Home
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Produk",
    href: "/admin/products",
    icon: Package,
  },
  {
    title: "Pesanan",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    title: "Pengguna",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Laporan",
    href: "/admin/reports",
    icon: BarChart3,
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-primary">Admin Panel</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {profile?.nama || 'Admin'}
        </p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {sidebarItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>
        ))}
      </nav>
      
      <div className="p-4 border-t space-y-2">
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link to="/">
            <Home className="h-4 w-4 mr-2" />
            Kembali ke Toko
          </Link>
        </Button>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden border-b bg-[hsl(var(--header-footer))] text-[hsl(var(--header-footer-foreground))]">
        <div className="flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold text-[hsl(var(--header-footer-foreground))]">Admin Panel</h1>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-[hsl(var(--header-footer-foreground))] hover:bg-[hsl(var(--header-footer-foreground))]/10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-5">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block lg:col-span-1 border-r min-h-screen">
          <SidebarContent />
        </div>
        
        {/* Main Content */}
        <div className="lg:col-span-4">
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}