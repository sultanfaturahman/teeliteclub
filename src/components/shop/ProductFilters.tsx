import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Filter, X } from "lucide-react";

interface FilterState {
  categories: string[];
  sizes: string[];
  priceRange: [number, number];
}

interface ProductFiltersProps {
  onFiltersChange?: (filters: FilterState) => void;
  className?: string;
}

export function ProductFilters({ onFiltersChange, className }: ProductFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    sizes: [],
    priceRange: [0, 1000000],
  });

  const categories = [
    { id: "pria", label: "Pria" },
    { id: "wanita", label: "Wanita" },
    { id: "anak", label: "Anak" },
  ];

  const sizes = [
    { id: "S", label: "S" },
    { id: "M", label: "M" },
    { id: "L", label: "L" },
    { id: "XL", label: "XL" },
    { id: "XXL", label: "XXL" },
  ];

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const newCategories = checked
      ? [...filters.categories, categoryId]
      : filters.categories.filter(id => id !== categoryId);
    
    const newFilters = { ...filters, categories: newCategories };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleSizeChange = (sizeId: string, checked: boolean) => {
    const newSizes = checked
      ? [...filters.sizes, sizeId]
      : filters.sizes.filter(id => id !== sizeId);
    
    const newFilters = { ...filters, sizes: newSizes };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handlePriceChange = (value: number[]) => {
    const newFilters = { ...filters, priceRange: [value[0], value[1]] as [number, number] };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const clearAllFilters = () => {
    const newFilters = {
      categories: [],
      sizes: [],
      priceRange: [0, 1000000] as [number, number],
    };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-base">
            <Filter className="h-4 w-4 mr-2" />
            Filter Produk
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="h-4 w-4 mr-1" />
            Hapus
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Categories */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-dark-blue">Kategori</h4>
          {categories.map((category) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={category.id}
                checked={filters.categories.includes(category.id)}
                onCheckedChange={(checked) => 
                  handleCategoryChange(category.id, checked as boolean)
                }
              />
              <Label htmlFor={category.id} className="text-sm">
                {category.label}
              </Label>
            </div>
          ))}
        </div>

        <Separator />

        {/* Sizes */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-dark-blue">Ukuran</h4>
          <div className="grid grid-cols-3 gap-2">
            {sizes.map((size) => (
              <div key={size.id} className="flex items-center space-x-2">
                <Checkbox
                  id={size.id}
                  checked={filters.sizes.includes(size.id)}
                  onCheckedChange={(checked) => 
                    handleSizeChange(size.id, checked as boolean)
                  }
                />
                <Label htmlFor={size.id} className="text-sm">
                  {size.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Price Range */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-dark-blue">Rentang Harga</h4>
          <div className="px-2">
            <Slider
              value={filters.priceRange}
              onValueChange={handlePriceChange}
              max={1000000}
              min={0}
              step={10000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{formatPrice(filters.priceRange[0])}</span>
              <span>{formatPrice(filters.priceRange[1])}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}