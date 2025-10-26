import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  gambar?: string[];
  product_sizes?: { ukuran: string; stok: number; product_id?: string; }[];
  ukuran?: string[];
  is_active?: boolean;
  created_at?: string;
}

interface ProductSize {
  ukuran: string;
  stok: number;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [productSizes, setProductSizes] = useState<ProductSize[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const fetchProductSizes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("product_sizes")
        .select("ukuran, stok")
        .eq("product_id", product.id);

      if (error) throw error;
      setProductSizes(data || []);
    } catch (error) {
      console.error("Error fetching product sizes:", error);
    }
  }, [product.id]);

  useEffect(() => {
    fetchProductSizes();
  }, [fetchProductSizes]);

  const getTotalStock = () => {
    return productSizes.reduce((total, size) => total + size.stok, 0);
  };

  const getSelectedSizeStock = () => {
    if (!selectedSize) return 0;
    const sizeData = productSizes.find(size => size.ukuran === selectedSize);
    return sizeData?.stok || 0;
  };

  const isOutOfStock = () => {
    return getTotalStock() === 0;
  };

  const isSelectedSizeOutOfStock = () => {
    return selectedSize && getSelectedSizeStock() === 0;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const getProductImages = () => {
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
  
  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImageIndex((prev) => 
      prev === productImages.length - 1 ? 0 : prev + 1
    );
  };
  
  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImageIndex((prev) => 
      prev === 0 ? productImages.length - 1 : prev - 1
    );
  };

  const handleAddToCart = async () => {
    if (!selectedSize && product.ukuran && product.ukuran.length > 0) {
      toast({
        title: "Error",
        description: "Please select a size",
        variant: "destructive",
      });
      return;
    }

    try {
      await addToCart(product.id, selectedSize || "", 1);
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

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg border-0 bg-card">
      <div className="aspect-square overflow-hidden bg-muted relative">
        <Link to={`/product/${product.id}`}>
          <img
            src={productImages[currentImageIndex]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
        
        {/* Image Navigation - Only show if multiple images */}
        {productImages.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={prevImage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={nextImage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            {/* Image Indicators */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {productImages.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentImageIndex(index);
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {product.category}
            </Badge>
            <Badge variant={getTotalStock() > 0 ? "default" : "destructive"} className="text-xs">
              {getTotalStock() > 0 ? "In Stock" : "Out of Stock"}
            </Badge>
          </div>
          <Link to={`/product/${product.id}`}>
            <h3 className="font-semibold text-lg leading-tight hover:text-primary transition-colors">
              {product.name}
            </h3>
          </Link>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {product.description.replace(/•/g, '•').replace(/^-\s/gm, '• ')}
            </p>
          )}
          <p className="font-bold text-xl text-primary">
            {formatCurrency(product.price)}
          </p>
        </div>

        {/* Add to Cart Button - Navigate to product detail */}
        <Button
          onClick={() => window.location.href = `/product/${product.id}`}
          disabled={isOutOfStock()}
          className="w-full"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {isOutOfStock() ? "Stok Habis" : "Lihat Detail"}
        </Button>

      </CardContent>
    </Card>
  );
}