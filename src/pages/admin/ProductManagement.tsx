import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Upload,
  Package,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { SizeChartEditor, type SizeChartData } from "@/components/admin/SizeChartEditor";
import type { Tables, Json, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  gambar?: string[];
  stock_quantity?: number;
  total_stock?: number; // Calculated total stock from product_sizes
  is_active: boolean;
  ukuran?: string[];
  size_chart?: SizeChartData | null;
  created_at: string;
}

type ProductRow = Tables<"products"> & {
  product_sizes: Array<{
    ukuran: string | null;
    stok: number | null;
  }> | null;
};

const deserializeSizeChart = (
  chart: Tables<"products">["size_chart"]
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

const serializeSizeChart = (chart: SizeChartData | null): Json => {
  if (!chart) {
    return null;
  }

  return {
    measurements: chart.measurements.map(({ name, unit }) => ({
      name,
      unit,
    })),
    sizes: chart.sizes,
  } as Json;
};

const ProductManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    image_url: "",
    stock_quantity: "",
    is_active: true,
    ukuran: ["S", "M", "L", "XL", "XXL"],
  });
  const [sizeStocks, setSizeStocks] = useState<Record<string, number>>({
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    XXL: 0,
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [sizeChart, setSizeChart] = useState<SizeChartData | null>(null);

  const categories = ["Men", "Women", "Accessories"];

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);

      // OPTIMIZED: Load products with sizes in single query to avoid N+1 problem
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          product_sizes (
            ukuran, stok
          )
        `)
        .order("created_at", { ascending: false })
        .returns<ProductRow[]>();

      if (error) throw error;

      // Calculate total stock from the loaded sizes data
      const productsWithStock: Product[] = (data || []).map((product) => {
        const totalStock =
          product.product_sizes?.reduce(
            (total, size) => total + (size.stok ?? 0),
            0
          ) ?? 0;

        return {
          id: product.id,
          name: product.name,
          description: product.description ?? undefined,
          price: product.price,
          category: product.category ?? "",
          image_url: product.image_url ?? undefined,
          gambar: product.gambar ?? undefined,
          stock_quantity: product.stock_quantity ?? totalStock,
          total_stock: totalStock,
          is_active: product.is_active ?? false,
          ukuran: product.ukuran ?? undefined,
          size_chart: deserializeSizeChart(product.size_chart),
          created_at: product.created_at ?? new Date().toISOString(),
        };
      });

      setProducts(productsWithStock);
    } catch (error) {
      logger.error("Failed to load products", error);
      toast.error("Gagal memuat produk");
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (product) =>
          product.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    setFilteredProducts(filtered);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      category: "",
      image_url: "",
      stock_quantity: "",
      is_active: true,
      ukuran: ["S", "M", "L", "XL", "XXL"],
    });
    setSizeStocks({
      S: 0,
      M: 0,
      L: 0,
      XL: 0,
      XXL: 0,
    });
    setEditingProduct(null);
    setSelectedFiles([]);
    setExistingImages([]);
    setSizeChart(null);
    setUploading(false);
  };

  const openEditDialog = async (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      category: product.category,
      image_url: product.image_url || "",
      stock_quantity: product.stock_quantity?.toString() || "0",
      is_active: product.is_active,
      ukuran: product.ukuran || ["S", "M", "L", "XL", "XXL"],
    });
    
    // Load existing images
    const images = [];
    if (product.image_url) images.push(product.image_url);
    if (product.gambar && product.gambar.length > 0) {
      images.push(...product.gambar.filter(img => img !== product.image_url));
    }
    setExistingImages(images);
    
    // Load existing size chart
    setSizeChart(product.size_chart || null);

    // Load existing size stocks
    try {
      const { data: productSizes, error } = await supabase
        .from("product_sizes")
        .select("ukuran, stok")
        .eq("product_id", product.id);

      if (error) throw error;

      const newSizeStocks: Record<string, number> = {
        S: 0,
        M: 0,
        L: 0,
        XL: 0,
        XXL: 0,
      };

      productSizes?.forEach((size) => {
        newSizeStocks[size.ukuran] = size.stok || 0;
      });

      setSizeStocks(newSizeStocks);
    } catch (error) {
      logger.error("Failed to load product sizes", error);
      setSizeStocks({
        S: 0,
        M: 0,
        L: 0,
        XL: 0,
        XXL: 0,
      });
    }

    setIsDialogOpen(true);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      logger.error("Failed to upload image", error);
      toast.error("Gagal mengunggah gambar");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate files
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} terlalu besar. Maksimal 5MB`);
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} bukan file gambar`);
        return;
      }
    }
    
    // Check total images limit (existing + new)
    if (existingImages.length + selectedFiles.length + files.length > 5) {
      toast.error("Maksimal 5 gambar per produk");
      return;
    }
    
    setSelectedFiles(prev => [...prev, ...files]);
  };
  
  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.category) {
      toast.error("Nama, harga, dan kategori harus diisi");
      return;
    }

    try {
      let allImages = [...existingImages];
      let primaryImageUrl = formData.image_url;

      // Upload new images if selected
      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map(file => uploadImage(file));
        const uploadedUrls = await Promise.all(uploadPromises);
        const validUrls = uploadedUrls.filter(url => url !== null) as string[];
        allImages = [...allImages, ...validUrls];
        
        // Set first uploaded image as primary if no existing primary
        if (!primaryImageUrl && validUrls.length > 0) {
          primaryImageUrl = validUrls[0];
        }
      }
      
      // If we have images in array but no primary, use first as primary
      if (!primaryImageUrl && allImages.length > 0) {
        primaryImageUrl = allImages[0];
      }

      const totalStock = calculateTotalStock();
      const productData: TablesUpdate<"products"> = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        category: formData.category,
        image_url: primaryImageUrl || null,
        gambar: allImages.length > 0 ? allImages : null,
        size_chart: serializeSizeChart(sizeChart),
        stock_quantity: totalStock, // Use calculated total stock from sizes
        is_active: formData.is_active,
        ukuran: formData.ukuran,
      };

      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;

        // Update product sizes - delete existing and insert new to avoid duplicates
        // First, delete all existing size records for this product
        const { error: deleteError } = await supabase
          .from("product_sizes")
          .delete()
          .eq("product_id", editingProduct.id);

        if (deleteError) throw deleteError;

        // Then insert the new size records
        const sizesToInsert = Object.entries(sizeStocks).map(
          ([size, stock]) => ({
            product_id: editingProduct.id,
            ukuran: size,
            stok: stock,
          })
        );

        const { error: insertError } = await supabase
          .from("product_sizes")
          .insert(sizesToInsert);

        if (insertError) throw insertError;

        toast.success("Produk berhasil diperbarui");
      } else {
        // Create new product
        const newProductPayload: TablesInsert<"products"> = {
          name: formData.name,
          description: formData.description || null,
          price: parseFloat(formData.price),
          category: formData.category,
          image_url: primaryImageUrl || null,
          gambar: allImages.length > 0 ? allImages : null,
          size_chart: serializeSizeChart(sizeChart),
          stock_quantity: totalStock,
          is_active: formData.is_active,
          ukuran: formData.ukuran,
        };

        const { data: newProduct, error } = await supabase
          .from("products")
          .insert([newProductPayload])
          .select()
          .single();

        if (error) throw error;

        // Create product sizes
        const sizesToInsert = Object.entries(sizeStocks).map(
          ([size, stock]) => ({
            product_id: newProduct.id,
            ukuran: size,
            stok: stock,
          })
        );

        const { error: sizesError } = await supabase
          .from("product_sizes")
          .insert(sizesToInsert);

        if (sizesError) throw sizesError;

        toast.success("Produk berhasil ditambahkan");
      }

      setIsDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error) {
      logger.error("Failed to save product", error);
      toast.error("Gagal menyimpan produk");
    }
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Yakin ingin menghapus produk "${productName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;
      toast.success("Produk berhasil dihapus");
      loadProducts();
    } catch (error) {
      logger.error("Failed to delete product", error);
      toast.error("Gagal menghapus produk");
    }
  };

  const toggleProductStatus = async (
    productId: string,
    currentStatus: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !currentStatus })
        .eq("id", productId);

      if (error) throw error;
      toast.success(
        `Produk ${!currentStatus ? "diaktifkan" : "dinonaktifkan"}`
      );
      loadProducts();
    } catch (error) {
      logger.error("Failed to update product status", error);
      toast.error("Gagal mengubah status produk");
    }
  };

  const calculateTotalStock = () => {
    return Object.values(sizeStocks).reduce((total, stock) => total + stock, 0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Manajemen Produk</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Produk
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct
                    ? "Perbarui informasi produk"
                    : "Masukkan informasi produk baru"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Produk *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Nama produk"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Kategori *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, category: value }))
                      }>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Deskripsi produk (gunakan '•' untuk bullet points)"
                    rows={5}
                    className="resize-none"
                  />
                  <div className="text-xs text-muted-foreground">
                    💡 Tips: Gunakan '•' di awal baris untuk membuat bullet points
                    <br />Contoh:
                    <br />• Bahan berkualitas tinggi
                    <br />• Nyaman digunakan
                    <br />• Tahan lama
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Harga *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                    placeholder="Harga"
                    required
                  />
                </div>

                <div className="space-y-4">
                  <Label>Stok per Ukuran</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {formData.ukuran.map((size) => {
                      return (
                        <div key={size} className="space-y-2">
                          <Label
                            htmlFor={`stock-${size}`}
                            className="text-sm font-medium">
                            {size}
                          </Label>
                          <Input
                            id={`stock-${size}`}
                            type="number"
                            min="0"
                            value={sizeStocks[size] || 0}
                            onChange={(e) => {
                              setSizeStocks((prev) => ({
                                ...prev,
                                [size]: parseInt(e.target.value) || 0,
                              }));
                            }}
                            placeholder="0"
                            className="text-center"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total stok: {calculateTotalStock()}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="image_upload">Upload Gambar (Maksimal 5)</Label>
                    <Input
                      id="image_upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <div className="text-xs text-muted-foreground">
                      Total gambar: {existingImages.length + selectedFiles.length}/5
                    </div>
                  </div>

                  {/* Existing Images */}
                  {existingImages.length > 0 && (
                    <div className="space-y-2">
                      <Label>Gambar Saat Ini</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {existingImages.map((imageUrl, index) => (
                          <div key={index} className="relative group">
                            <div className="w-full h-24 rounded-lg overflow-hidden bg-muted">
                              <img
                                src={imageUrl}
                                alt={`Existing ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/placeholder.svg";
                                }}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeExistingImage(index)}
                            >
                              ×
                            </Button>
                            {index === 0 && (
                              <Badge className="absolute bottom-1 left-1 text-xs">Utama</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Selected Files */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <Label>Gambar Baru</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="relative group">
                            <div className="w-full h-24 rounded-lg overflow-hidden bg-muted">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`New ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeSelectedFile(index)}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>atau</span>
                    <div className="h-px bg-border flex-1" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image_url">URL Gambar Utama</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          image_url: e.target.value,
                        }))
                      }
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_active: checked }))
                    }
                  />
                  <Label htmlFor="is_active">Produk Aktif</Label>
                </div>

                {/* Size Chart Editor */}
                <SizeChartEditor
                  value={sizeChart}
                  onChange={setSizeChart}
                  availableSizes={formData.ukuran}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? (
                      <>
                        <Upload className="h-4 w-4 mr-2 animate-spin" />
                        Mengunggah...
                      </>
                    ) : (
                      <>{editingProduct ? "Perbarui" : "Tambah"} Produk</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari produk..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category.toLowerCase()}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Daftar Produk ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Memuat produk...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery || selectedCategory !== "all"
                    ? "Tidak ada produk yang sesuai dengan filter"
                    : "Belum ada produk yang ditambahkan"}
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Harga</TableHead>
                      <TableHead>Stok</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              <img
                                src={product.image_url || "/placeholder.svg"}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {product.description?.replace(/•/g, '•').replace(/^-\s/gm, '• ')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatPrice(product.price)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{product.total_stock || 0}</span>
                            {(product.total_stock || 0) < 10 && (
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={product.is_active}
                              onCheckedChange={() =>
                                toggleProductStatus(
                                  product.id,
                                  product.is_active
                                )
                              }
                            />
                            <span className="text-sm">
                              {product.is_active ? "Aktif" : "Nonaktif"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(product)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDelete(product.id, product.name)
                              }
                              className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ProductManagement;
