import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Image, Upload, Save } from "lucide-react";
import { logger } from "@/lib/logger";

export function HeroSettings() {
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadHeroSettings();
  }, []);

  const loadHeroSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'hero_image_url')
        .single();

      if (data?.value) {
        setHeroImageUrl(data.value);
      }
    } catch (error) {
      logger.error('Failed to load hero settings', error);
      toast.error('Gagal memuat pengaturan hero');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `hero-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setHeroImageUrl(publicUrl);
      toast.success('Gambar berhasil diunggah');
    } catch (error) {
      logger.error('Failed to upload hero image', error);
      toast.error('Gagal mengunggah gambar');
    } finally {
      setIsUploading(false);
    }
  };

  const saveHeroSettings = async () => {
    if (!heroImageUrl.trim()) {
      toast.error('URL gambar tidak boleh kosong');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: heroImageUrl })
        .eq('key', 'hero_image_url');

      if (error) throw error;

      toast.success('Pengaturan hero berhasil disimpan');
    } catch (error) {
      logger.error('Failed to save hero settings', error);
      toast.error('Gagal menyimpan pengaturan hero');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Pengaturan Hero Section
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Hero Image Preview */}
        {heroImageUrl && (
          <div className="space-y-2">
            <Label>Preview Gambar Saat Ini</Label>
            <div className="relative w-full h-48 rounded-lg overflow-hidden border">
              <img
                src={heroImageUrl}
                alt="Hero preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Upload New Image */}
        <div className="space-y-2">
          <Label htmlFor="hero-upload">Unggah Gambar Baru</Label>
          <div className="flex gap-2">
            <Input
              id="hero-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
              className="flex-1"
            />
            <Button
              variant="outline"
              disabled={isUploading}
              className="shrink-0"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Mengunggah...' : 'Pilih File'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Format yang didukung: JPG, PNG, WebP. Ukuran maksimal: 5MB
          </p>
        </div>

        {/* Manual URL Input */}
        <div className="space-y-2">
          <Label htmlFor="hero-url">URL Gambar Hero</Label>
          <Input
            id="hero-url"
            type="url"
            value={heroImageUrl}
            onChange={(e) => setHeroImageUrl(e.target.value)}
            placeholder="https://example.com/hero-image.jpg"
          />
          <p className="text-sm text-muted-foreground">
            Atau masukkan URL gambar secara manual
          </p>
        </div>

        {/* Save Button */}
        <Button
          onClick={saveHeroSettings}
          disabled={isLoading || !heroImageUrl.trim()}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
      </CardContent>
    </Card>
  );
}