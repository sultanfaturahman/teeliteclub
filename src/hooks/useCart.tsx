import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  ukuran: string;
  user_id?: string;
  product?: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    gambar?: string[];
  };
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  addToCart: (productId: string, ukuran: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartTotal: () => number;
  getCartItemsCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCartItems();
  }, []);

  const loadCartItems = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Load from localStorage for guest users
        const localCart = localStorage.getItem('cart');
        if (localCart) {
          try {
            const parsedCart = JSON.parse(localCart);
            // Validate cart structure
            if (Array.isArray(parsedCart)) {
              const validItems = parsedCart.filter(item => 
                item && 
                typeof item.product_id === 'string' && 
                typeof item.quantity === 'number' && 
                item.quantity > 0 &&
                typeof item.ukuran === 'string'
              );
              setItems(validItems);
            }
          } catch (error) {
            console.error('Invalid cart data in localStorage:', error);
            localStorage.removeItem('cart');
          }
        }
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          products!cart_items_product_id_fkey(id, name, price, image_url, gambar)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      // Transform the data to match expected structure
      const transformedData = (data || []).map(item => ({
        ...item,
        product: item.products
      }));
      setItems(transformedData);
    } catch (error) {
      console.error('Error loading cart:', error);
      // Don't show toast error for initial cart load to avoid spam
      // Just log it and set empty cart
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId: string, ukuran: string, quantity = 1) => {
    try {
      // CRITICAL: Check stock availability first
      const { data: stockData, error: stockError } = await supabase
        .from('product_sizes')
        .select('stok')
        .eq('product_id', productId)
        .eq('ukuran', ukuran)
        .single();

      if (stockError) {
        console.error('Error checking stock:', stockError);
        toast.error('Gagal memeriksa stok produk');
        return;
      }

      if (!stockData || stockData.stok < quantity) {
        toast.error(`Stok tidak mencukupi. Stok tersedia: ${stockData?.stok || 0}`);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Handle guest cart in localStorage with stock validation
        const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
        const existingItem = localCart.find((item: CartItem) => 
          item.product_id === productId && item.ukuran === ukuran
        );

        const totalQuantityRequested = existingItem ? existingItem.quantity + quantity : quantity;
        
        // Validate total quantity against available stock
        if (totalQuantityRequested > stockData.stok) {
          toast.error(`Stok tidak mencukupi. Stok tersedia: ${stockData.stok}, di keranjang: ${existingItem?.quantity || 0}`);
          return;
        }

        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          // Get product details
          const { data: product } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

          localCart.push({
            id: Date.now().toString(),
            product_id: productId,
            quantity,
            ukuran,
            product
          });
        }

        localStorage.setItem('cart', JSON.stringify(localCart));
        setItems(localCart);
        toast.success('Produk ditambahkan ke keranjang!');
        return;
      }

      // Use upsert to handle both insert and update cases
      const { data: existingItems } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .eq('ukuran', ukuran);

      if (existingItems && existingItems.length > 0) {
        // Update existing item
        const newQuantity = existingItems[0].quantity + quantity;
        if (newQuantity > stockData.stok) {
          toast.error(`Stok tidak mencukupi. Stok tersedia: ${stockData.stok}, di keranjang: ${existingItems[0].quantity}`);
          return;
        }
        
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', existingItems[0].id);

        if (error) throw error;
      } else {
        // Insert new item
        const { error } = await supabase
          .from('cart_items')
          .insert([{
            user_id: user.id,
            product_id: productId,
            quantity,
            ukuran
          }]);

        if (error) {
          // If we get a unique constraint violation, it means another thread inserted the same item
          // Let's try to update it instead
          if (error.code === '23505') {
            const { data: existingItem } = await supabase
              .from('cart_items')
              .select('*')
              .eq('user_id', user.id)
              .eq('product_id', productId)
              .eq('ukuran', ukuran)
              .single();

            if (existingItem) {
              const newQuantity = existingItem.quantity + quantity;
              if (newQuantity > stockData.stok) {
                toast.error(`Stok tidak mencukupi. Stok tersedia: ${stockData.stok}, di keranjang: ${existingItem.quantity}`);
                return;
              }
              
              const { error: updateError } = await supabase
                .from('cart_items')
                .update({ quantity: newQuantity })
                .eq('id', existingItem.id);

              if (updateError) throw updateError;
            }
          } else {
            throw error;
          }
        }
      }
      
      await loadCartItems();
      toast.success('Produk ditambahkan ke keranjang!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Gagal menambahkan ke keranjang');
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // For guest users, get cart item details to validate stock
        const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
        const cartItem = localCart.find((item: CartItem) => item.id === itemId);
        
        if (cartItem && quantity > 0) {
          // Validate stock for guest cart
          const { data: stockData } = await supabase
            .from('product_sizes')
            .select('stok')
            .eq('product_id', cartItem.product_id)
            .eq('ukuran', cartItem.ukuran)
            .single();

          if (!stockData || quantity > stockData.stok) {
            toast.error(`Stok tidak mencukupi. Stok tersedia: ${stockData?.stok || 0}`);
            return;
          }
        }

        const updatedCart = localCart.map((item: CartItem) =>
          item.id === itemId ? { ...item, quantity } : item
        );
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        setItems(updatedCart);
        return;
      }

      if (quantity <= 0) {
        await removeFromCart(itemId);
        return;
      }

      await updateQuantityWithValidation(itemId, quantity);
    } catch (error) {
      console.error('Error updating cart:', error);
      toast.error('Gagal mengupdate keranjang');
    }
  };

  const updateQuantityWithValidation = async (itemId: string, quantity: number) => {
    try {
      // Get cart item details to validate stock
      const { data: cartItem } = await supabase
        .from('cart_items')
        .select('product_id, ukuran')
        .eq('id', itemId)
        .single();

      if (!cartItem) {
        throw new Error('Cart item not found');
      }

      // Validate stock availability
      const { data: stockData, error: stockError } = await supabase
        .from('product_sizes')
        .select('stok')
        .eq('product_id', cartItem.product_id)
        .eq('ukuran', cartItem.ukuran)
        .single();

      if (stockError) {
        throw new Error('Failed to check stock');
      }

      if (!stockData || quantity > stockData.stok) {
        toast.error(`Stok tidak mencukupi. Stok tersedia: ${stockData?.stok || 0}`);
        return;
      }

      // Update quantity if stock is sufficient
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);

      if (error) throw error;
      await loadCartItems();
      toast.success('Kuantitas berhasil diupdate!');
    } catch (error) {
      console.error('Error updating cart with validation:', error);
      toast.error('Gagal mengupdate keranjang');
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
        const updatedCart = localCart.filter((item: CartItem) => item.id !== itemId);
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        setItems(updatedCart);
        toast.success('Item dihapus dari keranjang');
        return;
      }

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      await loadCartItems();
      toast.success('Item dihapus dari keranjang');
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Gagal menghapus dari keranjang');
    }
  };

  const clearCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        localStorage.removeItem('cart');
        setItems([]);
        return;
      }

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setItems([]);
      toast.success('Keranjang dikosongkan');
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Gagal mengosongkan keranjang');
    }
  };

  const getCartTotal = () => {
    return items.reduce((total, item) => {
      const price = item.product?.price || 0;
      return total + (price * item.quantity);
    }, 0);
  };

  const getCartItemsCount = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{
      items,
      loading,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      getCartTotal,
      getCartItemsCount
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}