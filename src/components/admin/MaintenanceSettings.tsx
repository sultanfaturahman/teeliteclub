import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { Settings, Clock, AlertTriangle } from "lucide-react";

interface MaintenanceSettings {
  id: string;
  is_enabled: boolean;
  maintenance_start: string | null;
  maintenance_end: string | null;
  title: string;
  message: string;
  countdown_message: string;
}

export const MaintenanceSettings = () => {
  const [settings, setSettings] = useState<MaintenanceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_settings')
        .select('*')
        .single();

      if (error) {
        logger.error('Failed to load maintenance settings', error);
        toast.error('Gagal memuat pengaturan maintenance');
        return;
      }

      setSettings(data);
    } catch (error) {
      logger.error('Failed to load maintenance settings', error);
      toast.error('Gagal memuat pengaturan maintenance');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('maintenance_settings')
        .update({
          is_enabled: settings.is_enabled,
          maintenance_start: settings.maintenance_start,
          maintenance_end: settings.maintenance_end,
          title: settings.title,
          message: settings.message,
          countdown_message: settings.countdown_message,
        })
        .eq('id', settings.id);

      if (error) {
        logger.error('Failed to save maintenance settings', error);
        toast.error('Gagal menyimpan pengaturan maintenance');
        return;
      }

      toast.success('Pengaturan maintenance berhasil disimpan');
    } catch (error) {
      logger.error('Failed to save maintenance settings', error);
      toast.error('Gagal menyimpan pengaturan maintenance');
    } finally {
      setSaving(false);
    }
  };

  const formatDateTimeLocal = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().slice(0, 16);
  };

  const handleDateTimeChange = (field: 'maintenance_start' | 'maintenance_end', value: string) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      [field]: value ? new Date(value).toISOString() : null
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Pengaturan Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Pengaturan Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Gagal memuat pengaturan maintenance.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Pengaturan Maintenance
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Atur halaman maintenance dengan countdown untuk pengumuman produk baru
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {settings.is_enabled && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                Mode maintenance sedang aktif
              </span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-blue-800">
                💡 <strong>Admin:</strong> Untuk melihat halaman maintenance, tambahkan{' '}
                <code className="bg-blue-100 px-1 py-0.5 rounded">?test_maintenance=true</code>{' '}
                di URL (contoh: {window.location.origin}?test_maintenance=true)
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Switch
            id="maintenance-enabled"
            checked={settings.is_enabled}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, is_enabled: checked })
            }
          />
          <Label htmlFor="maintenance-enabled">Aktifkan Mode Maintenance</Label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="maintenance-start">Mulai Maintenance</Label>
            <Input
              id="maintenance-start"
              type="datetime-local"
              value={formatDateTimeLocal(settings.maintenance_start)}
              onChange={(e) => handleDateTimeChange('maintenance_start', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenance-end">Selesai Maintenance</Label>
            <Input
              id="maintenance-end"
              type="datetime-local"
              value={formatDateTimeLocal(settings.maintenance_end)}
              onChange={(e) => handleDateTimeChange('maintenance_end', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Judul Halaman</Label>
          <Input
            id="title"
            value={settings.title}
            onChange={(e) => setSettings({ ...settings, title: e.target.value })}
            placeholder="Produk Baru Segera Hadir!"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Pesan Utama</Label>
          <Textarea
            id="message"
            value={settings.message}
            onChange={(e) => setSettings({ ...settings, message: e.target.value })}
            placeholder="Kami sedang mempersiapkan koleksi terbaru untuk Anda..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="countdown-message">Pesan Countdown</Label>
          <Input
            id="countdown-message"
            value={settings.countdown_message}
            onChange={(e) => setSettings({ ...settings, countdown_message: e.target.value })}
            placeholder="Produk baru akan tersedia dalam:"
          />
        </div>

        {settings.maintenance_end && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Countdown akan berakhir pada: {new Date(settings.maintenance_end).toLocaleString('id-ID')}
            </span>
          </div>
        )}

        <Button onClick={saveSettings} disabled={saving} className="w-full">
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
      </CardContent>
    </Card>
  );
};