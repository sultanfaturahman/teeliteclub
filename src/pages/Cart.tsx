import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { CartSkeleton } from "@/components/loading/PageSkeleton";

const Cart = () => {
  const { items, loading, updateQuantity, removeFromCart, getCartTotal, getCartItemsCount } = useCart();
  const { user } = useAuth();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CartSkeleton />
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
        <div className="container mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali berbelanja
            </Link>
          </div>

          <Card className="overflow-hidden rounded-3xl border border-dashed border-border/70 bg-card/80 shadow-sm">
            <CardContent className="flex flex-col items-center gap-6 px-6 py-14 text-center">
              <div className="rounded-full bg-muted/80 p-5 text-muted-foreground">
                <ShoppingBag className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">
                  Keranjang masih kosong
                </h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Temukan koleksi terbaru kami dan tambahkan produk favorit Anda ke keranjang.
                </p>
              </div>
              <Button asChild className="rounded-full px-6">
                <Link to="/shop">Mulai Belanja</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="container mx-auto max-w-5xl px-4 py-10 sm:py-16">
        <div className="mb-8 flex flex-col-reverse gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Lanjutkan berbelanja
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Keranjang Anda
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">
                Siap checkout?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                Periksa kembali detail produk sebelum melanjutkan ke proses pembayaran.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="self-start rounded-full px-4 py-2 text-sm">
            {getCartItemsCount()} item
          </Badge>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Order Summary */}
          <aside className="lg:order-2">
            <Card className="rounded-3xl border border-border/80 bg-card/90 shadow-sm lg:sticky lg:top-6">
              <CardHeader className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Ringkasan
                </p>
                <CardTitle className="text-2xl text-foreground">Total pesanan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="text-foreground">
                      {formatPrice(getCartTotal())}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Ongkos kirim</span>
                    <span>Dihitung di checkout</span>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(getCartTotal())}</span>
                </div>

                <div className="space-y-2">
                  {user ? (
                    <Button className="w-full rounded-full py-5 text-base" asChild>
                      <Link to="/checkout">Lanjut ke checkout</Link>
                    </Button>
                  ) : (
                    <>
                      <Button className="w-full rounded-full py-5 text-base" asChild>
                        <Link to="/auth">Login untuk checkout</Link>
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        Atau lanjutkan sebagai guest di halaman checkout
                      </p>
                    </>
                  )}
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">
                  Pajak dan biaya tambahan dihitung saat proses pembayaran selesai.
                  Pastikan alamat pengiriman sudah benar sebelum melanjutkan.
                </p>
              </CardContent>
            </Card>
          </aside>

          {/* Cart Items */}
          <section className="space-y-5 lg:order-1">
            {items.map((item) => {
              const imageUrl = item.product?.gambar?.[0] || item.product?.image_url || "/placeholder.svg";
              const price = item.product?.price || 0;

              return (
                <Card key={item.id} className="rounded-3xl border border-border/70 bg-card shadow-sm">
                  <CardContent className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-start">
                    <div className="relative h-28 w-full overflow-hidden rounded-2xl bg-muted sm:h-32 sm:w-32">
                      <img
                        src={imageUrl}
                        alt={item.product?.name}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="flex flex-1 flex-col gap-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {item.product?.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="rounded-full border-border/80 px-3 py-1 text-xs uppercase tracking-[0.18em]">
                              Ukuran {item.ukuran}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.id)}
                          className="self-start rounded-full text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="h-10 w-10 rounded-full"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="h-10 w-16 rounded-full border-border/70 text-center text-base"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-10 w-10 rounded-full"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-lg font-semibold text-foreground">
                            {formatPrice(price * item.quantity)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatPrice(price)} / item
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Cart;
