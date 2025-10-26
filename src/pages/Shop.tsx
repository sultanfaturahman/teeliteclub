import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ProductGridSkeleton } from "@/components/loading/ProductSkeleton";
interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  gambar?: string[];
  product_sizes: { ukuran: string; stok: number; product_id?: string; }[];
  ukuran?: string[];
  is_active?: boolean;
  created_at?: string;
}
const Shop = () => {
  const {
    user,
    profile,
    signOut
  } = useAuth();
  const {
    getCartItemsCount
  } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchProducts();
  }, []);
  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('🔍 Starting to fetch products...');

      // Try the relationship query first
      console.log('📡 Attempting relationship query...');
      const { data: relationshipData, error: relationshipError } = await supabase
        .from("products")
        .select(`
          id, name, price, image_url, category, description, is_active, created_at,
          product_sizes (
            ukuran, stok
          )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!relationshipError && relationshipData) {
        console.log('✅ Relationship query successful:', relationshipData.length, 'products');
        setProducts(relationshipData);
        return;
      }

      console.warn('⚠️ Relationship query failed, trying fallback:', relationshipError);

      // Fallback: Try simple query + separate sizes query
      const { data: simpleData, error: simpleError } = await supabase
        .from("products")
        .select("id, name, price, image_url, category, description, is_active, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (simpleError) {
        console.error("❌ Simple products query failed:", simpleError);
        throw simpleError;
      }

      console.log('✅ Simple products query successful:', simpleData?.length, 'products');

      // Get sizes separately
      if (simpleData && simpleData.length > 0) {
        const productIds = simpleData.map(p => p.id);
        const { data: sizesData, error: sizesError } = await supabase
          .from("product_sizes")
          .select("product_id, ukuran, stok")
          .in("product_id", productIds);

        if (!sizesError && sizesData) {
          console.log('✅ Product sizes query successful:', sizesData.length, 'sizes');

          // Combine products with their sizes
          const productsWithSizes = simpleData.map(product => ({
            ...product,
            product_sizes: sizesData.filter(size => size.product_id === product.id) || []
          }));

          setProducts(productsWithSizes);
        } else {
          console.warn('⚠️ Product sizes query failed:', sizesError);
          // Use products without sizes
          const productsWithEmptySizes = simpleData.map(product => ({
            ...product,
            product_sizes: []
          }));
          setProducts(productsWithEmptySizes);
        }
      } else {
        setProducts([]);
      }

    } catch (error) {
      console.error("❌ Error fetching products:", error);
      toast.error("Failed to load products: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-[hsl(var(--header-footer))] text-[hsl(var(--header-footer-foreground))]">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              <Link to="/" className="text-2xl font-etna font-black text-[hsl(var(--header-footer-foreground))] tracking-wider">
                TEELITECLUB
              </Link>
              <div className="flex items-center space-x-6">
                <Button variant="ghost" size="icon" className="relative text-[hsl(var(--header-footer-foreground))] hover:bg-[hsl(var(--header-footer-foreground))]/10" asChild>
                  <Link to="/cart">
                    <ShoppingCart className="h-6 w-6" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" className="text-[hsl(var(--header-footer-foreground))] hover:bg-[hsl(var(--header-footer-foreground))]/10">
                  <User className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">Shop</h1>
            <p className="text-muted-foreground">Discover our latest collection</p>
          </div>
          <ProductGridSkeleton />
        </main>
        
        <Footer />
      </div>
    );
  }
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-[hsl(var(--header-footer))] text-[hsl(var(--header-footer-foreground))]">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="text-2xl font-etna font-black text-[hsl(var(--header-footer-foreground))] tracking-wider">
              TEELITECLUB
            </Link>

            {/* Right side - Shop, Cart, User */}
            <div className="flex items-center space-x-6">
              

              {/* Cart */}
              <Button variant="ghost" size="icon" className="relative text-[hsl(var(--header-footer-foreground))] hover:bg-[hsl(var(--header-footer-foreground))]/10" asChild>
                <Link to="/cart">
                  <ShoppingCart className="h-6 w-6" />
                  {getCartItemsCount() > 0 && <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
                      {getCartItemsCount()}
                    </Badge>}
                </Link>
              </Button>

              {/* User Account */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-[hsl(var(--header-footer-foreground))] hover:bg-[hsl(var(--header-footer-foreground))]/10">
                    <User className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {user ? <>
                      <DropdownMenuItem disabled>
                        <div className="flex flex-col">
                          <span className="font-medium">{profile?.nama || 'User'}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/account">My Account</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/orders">My Orders</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={signOut} className="text-destructive">
                        Logout
                      </DropdownMenuItem>
                    </> : <DropdownMenuItem asChild>
                      <Link to="/auth">Login / Register</Link>
                    </DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-muted/50 border-b">
        
      </div>

      <main className="container mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Results Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b">
            <div>
              <h2 className="text-2xl font-medium text-foreground">Products</h2>
              
            </div>
          </div>

          {/* Products Grid */}
          <div className="space-y-8">
            {products.length > 0 ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {products.map(product => <div key={product.id} className="group">
                     <ProductCard product={product} />
                   </div>)}
              </div> : <div className="flex flex-col items-center justify-center py-24">
                <div className="text-center space-y-4 max-w-md">
                  <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">No products found</h3>
                  <p className="text-muted-foreground">
                    No products are currently available.
                  </p>
                </div>
              </div>}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>;
};
export default Shop;