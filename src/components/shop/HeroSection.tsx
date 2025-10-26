import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
      <div className="container mx-auto px-4 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              Fashion Terbaik
              <span className="block text-3xl lg:text-5xl text-primary-foreground/90">
                Untuk Gaya Hidup Anda
              </span>
            </h1>
            <p className="text-lg lg:text-xl text-primary-foreground/90 max-w-md">
              Temukan koleksi pakaian berkualitas tinggi dengan desain modern dan harga terjangkau. 
              Ekspresikan kepribadian Anda dengan gaya yang sempurna.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" variant="secondary" className="text-primary">
                Jelajahi Koleksi
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                Lihat Promo
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-2xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 flex items-center justify-center">
              <div className="text-6xl lg:text-8xl font-bold text-primary-foreground/30">
                TEELITECLUB
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary-foreground/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary-foreground/10 rounded-full blur-xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
}