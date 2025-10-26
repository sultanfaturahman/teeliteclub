import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { ProductHeader } from "@/components/layout/ProductHeader";
import { SizeChart } from "@/components/shop/SizeChart";
import type { SizeChartData } from "@/components/admin/SizeChartEditor";
import type { Tables } from "@/integrations/supabase/types";
import { ProductDetailSkeleton } from "@/components/loading/ProductSkeleton";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  gambar: string[] | null;
  category: string;
  stock_quantity: number;
  ukuran: string[];
  size_chart?: SizeChartData | null;
}

interface ProductSize {
  ukuran: string;
  stok: number;
}

type ProductRow = Tables<"products">;

const deserializeSizeChart = (
  chart: ProductRow["size_chart"]
): SizeChartData | null => {
  if (!chart || typeof chart !== "object" || Array.isArray(chart)) {
    return null;
  }

  const maybeChart = chart as {
    measurements?: Array<{ name?: unknown; unit?: unknown }>;
    sizes?: Record<string, Record<string, unknown>>;
  };

  if (
    !Array.isArray(maybeChart.measurements) ||
    !maybeChart.sizes ||
    typeof maybeChart.sizes !== "object"
  ) {
    return null;
  }

  const measurements = maybeChart.measurements
    .map((measurement) => {
      if (
        !measurement ||
        typeof measurement.name !== "string" ||
        typeof measurement.unit !== "string"
      ) {
        return null;
      }

      return {
        name: measurement.name,
        unit: measurement.unit,
      };
    })
    .filter(Boolean) as SizeChartData["measurements"];

  const sizes = Object.fromEntries(
    Object.entries(maybeChart.sizes).map(([sizeKey, entries]) => [
      sizeKey,
      Object.fromEntries(
        Object.entries(entries ?? {}).map(([entryKey, value]) => [
          entryKey,
          value != null ? String(value) : "",
        ])
      ),
    ])
  );

  return {
    measurements,
    sizes,
  };
};

const mapProductRowToProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  description: row.description ?? "",
  price: row.price,
  image_url: row.image_url,
  gambar: row.gambar,
  category: row.category,
  stock_quantity: row.stock_quantity ?? 0,
  ukuran: row.ukuran ?? [],
  size_chart: deserializeSizeChart(row.size_chart),
});

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart, getCartItemsCount } = useCart();
  const { user, profile, signOut } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [productSizes, setProductSizes] = useState<ProductSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const fetchProduct = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error || !data) throw error ?? new Error("Product not found");
      setProduct(mapProductRowToProduct(data as ProductRow));

      // Fetch product sizes
      const { data: sizesData, error: sizesError } = await supabase
        .from("product_sizes")
        .select("ukuran, stok")
        .eq("product_id", id);

      if (sizesError) throw sizesError;
      setProductSizes(sizesData || []);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive",
      });
      navigate("/shop");
    } finally {
      setLoading(false);
    }
  }, [id, toast, navigate]);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id, fetchProduct]);

  const totalStock = useMemo(() => {
    return productSizes.reduce((total, size) => total + size.stok, 0);
  }, [productSizes]);

  const uniqueSizes = useMemo(() => {
    const sizeMap = new Map();
    productSizes.forEach((size) => {
      if (!sizeMap.has(size.ukuran)) {
        sizeMap.set(size.ukuran, size.stok);
      } else {
        // If duplicate, sum the stock
        sizeMap.set(size.ukuran, sizeMap.get(size.ukuran) + size.stok);
      }
    });

    return Array.from(sizeMap.entries()).map(([ukuran, stok]) => ({
      ukuran,
      stok,
    }));
  }, [productSizes]);

  const selectedSizeStock = useMemo(() => {
    const sizeData = uniqueSizes.find((size) => size.ukuran === selectedSize);
    return sizeData ? sizeData.stok : 0;
  }, [uniqueSizes, selectedSize]);

  // Reset quantity when size changes to prevent invalid state
  useEffect(() => {
    if (selectedSize && selectedSizeStock > 0) {
      setQuantity(Math.min(quantity, selectedSizeStock));
    }
  }, [selectedSize, selectedSizeStock, quantity]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const handleAddToCart = async () => {
    if (!product || !selectedSize) {
      toast({
        title: "Error",
        description: "Please select a size",
        variant: "destructive",
      });
      return;
    }

    try {
      await addToCart(product.id, selectedSize, quantity);
      toast({
        title: "Success",
        description: `${product.name} added to cart`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  const handleDirectCheckout = async () => {
    if (!product || !selectedSize) {
      toast({
        title: "Error",
        description: "Please select a size",
        variant: "destructive",
      });
      return;
    }

    try {
      // Add item to cart first
      await addToCart(product.id, selectedSize, quantity);
      // Navigate directly to checkout
      navigate("/checkout");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to proceed to checkout",
        variant: "destructive",
      });
    }
  };

  const getProductImages = () => {
    if (!product) return [];
    
    const images = [];
    if (product.gambar && product.gambar.length > 0) {
      images.push(...product.gambar);
    } else if (product.image_url) {
      images.push(product.image_url);
    }
    
    if (images.length === 0) {
      images.push("https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop");
    }
    
    return images;
  };
  
  const productImages = getProductImages();
  
  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === productImages.length - 1 ? 0 : prev + 1
    );
  };
  
  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? productImages.length - 1 : prev - 1
    );
  };
  
  const formatDescription = (description: string) => {
    if (!description) return null;
    
    return description.split('\n').map((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        return (
          <li key={index} className="ml-4 list-disc list-inside">
            {trimmedLine.substring(1).trim()}
          </li>
        );
      }
      return trimmedLine ? (
        <p key={index} className="mb-2">
          {trimmedLine}
        </p>
      ) : (
        <br key={index} />
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ProductHeader 
          getCartItemsCount={getCartItemsCount}
          user={user}
          profile={profile}
          signOut={signOut}
        />
        <ProductDetailSkeleton />
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <ProductHeader 
          getCartItemsCount={getCartItemsCount}
          user={user}
          profile={profile}
          signOut={signOut}
        />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-2">Product not found</h2>
              <p className="text-muted-foreground mb-4">
                The product you're looking for doesn't exist or has been
                removed.
              </p>
              <Button onClick={() => navigate("/shop")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Shop
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ProductHeader 
        getCartItemsCount={getCartItemsCount}
        user={user}
        profile={profile}
        signOut={signOut}
      />
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/shop")}
          className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Shop
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square rounded-lg overflow-hidden bg-muted relative group">
              <img
                src={productImages[currentImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              
              {/* Image Navigation - Only show if multiple images */}
              {productImages.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  
                  {/* Image Indicators */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {productImages.map((_, index) => (
                      <button
                        key={index}
                        className={`w-3 h-3 rounded-full transition-colors ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            
            {/* Thumbnail Images */}
            {productImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {productImages.map((image, index) => (
                  <button
                    key={index}
                    className={`aspect-square rounded-lg overflow-hidden bg-muted border-2 transition-colors ${
                      index === currentImageIndex ? 'border-primary' : 'border-transparent'
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{product.category}</Badge>
                <Badge
                  variant={totalStock > 0 ? "default" : "destructive"}>
                  {totalStock > 0 ? "In Stock" : "Out of Stock"}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              <p className="text-2xl font-semibold text-primary">
                {formatCurrency(product.price)}
              </p>
            </div>

            {product.description && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <div className="text-muted-foreground">
                  <div className="space-y-2">
                    {formatDescription(product.description)}
                  </div>
                </div>
              </div>
            )}

            {/* Product Options Section */}
            <div className="space-y-4 border-t border-border pt-6">
              {/* Size Selection */}
              {productSizes.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Size</h3>
                  <Select value={selectedSize} onValueChange={setSelectedSize}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a size" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueSizes.map((sizeData) => (
                        <SelectItem
                          key={sizeData.ukuran}
                          value={sizeData.ukuran}
                          disabled={sizeData.stok === 0}>
                          {sizeData.ukuran} {sizeData.stok === 0 && "(Out of Stock)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSize && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Stock available: {selectedSizeStock}
                    </p>
                  )}
                </div>
              )}

              {/* Quantity Selection */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Quantity</h3>
                <Select
                  value={quantity.toString()}
                  onValueChange={(value) => setQuantity(parseInt(value))}
                  disabled={!selectedSize || selectedSizeStock === 0}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      { length: Math.min(10, selectedSizeStock) },
                      (_, i) => i + 1
                    ).map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedSize && productSizes.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Please select a size first
                  </p>
                )}
              </div>
            </div>

            {/* Size Chart */}
            {product.size_chart && product.size_chart.measurements && product.size_chart.measurements.length > 0 && (
              <SizeChart
                sizeChart={product.size_chart}
                availableSizes={product.ukuran || []}
              />
            )}

            {/* Action Buttons - Desktop */}
            <div className="hidden lg:flex flex-col gap-3">
              <Button
                onClick={handleDirectCheckout}
                disabled={
                  totalStock === 0 ||
                  !selectedSize ||
                  selectedSizeStock === 0
                }
                className="w-full"
                size="lg">
                <CreditCard className="w-4 h-4 mr-2" />
                {totalStock === 0 ? "Out of Stock" : "Beli Sekarang"}
              </Button>

              <Button
                onClick={handleAddToCart}
                disabled={
                  totalStock === 0 ||
                  !selectedSize ||
                  selectedSizeStock === 0
                }
                variant="outline"
                className="w-full"
                size="lg">
                <ShoppingCart className="w-4 h-4 mr-2" />
                {totalStock === 0 ? "Out of Stock" : "Add to Cart"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Buttons */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50">
        {/* Size and Price Info */}
        {selectedSize && (
          <div className="px-4 py-2 bg-muted/50 border-b border-border">
            <div className="flex justify-between items-center text-sm max-w-md mx-auto">
              <span className="font-medium">Size: {selectedSize}</span>
              <span className="font-bold text-primary">{formatCurrency(product.price)}</span>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="p-4">
          <div className="flex gap-3 max-w-md mx-auto">
            <Button
              onClick={handleAddToCart}
              disabled={
                totalStock === 0 ||
                !selectedSize ||
                selectedSizeStock === 0
              }
              variant="outline"
              className="flex-1"
              size="lg">
              <ShoppingCart className="w-4 h-4 mr-2" />
              {totalStock === 0 ? "Habis" : "Keranjang"}
            </Button>
            
            <Button
              onClick={handleDirectCheckout}
              disabled={
                totalStock === 0 ||
                !selectedSize ||
                selectedSizeStock === 0
              }
              className="flex-1"
              size="lg">
              <CreditCard className="w-4 h-4 mr-2" />
              {totalStock === 0 ? "Habis" : "Beli Sekarang"}
            </Button>
          </div>
          
          {/* Size Selection Prompt */}
          {!selectedSize && productSizes.length > 0 && (
            <div className="mt-2 text-center">
              <span className="text-sm text-muted-foreground">⬆️ Pilih ukuran terlebih dahulu</span>
            </div>
          )}
        </div>
      </div>

      {/* Add bottom padding for mobile to prevent content being hidden behind sticky buttons */}
      <div className="lg:hidden h-24"></div>

      <Footer />
    </div>
  );
};

export default ProductDetail;
