import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

export interface SizeChartData {
  measurements: Array<{
    name: string;
    unit: string;
  }>;
  sizes: Record<string, Record<string, string>>;
}

interface SizeChartEditorProps {
  value: SizeChartData | null;
  onChange: (sizeChart: SizeChartData | null) => void;
  availableSizes: string[];
}

export function SizeChartEditor({ value, onChange, availableSizes }: SizeChartEditorProps) {
  const [newMeasurement, setNewMeasurement] = useState({ name: "", unit: "cm" });

  const sizeChart = value || { measurements: [], sizes: {} };

  const addMeasurement = () => {
    if (!newMeasurement.name.trim()) {
      toast.error("Nama pengukuran harus diisi");
      return;
    }

    const updatedChart = {
      ...sizeChart,
      measurements: [...sizeChart.measurements, { ...newMeasurement }],
    };

    // Add empty values for all sizes for this measurement
    availableSizes.forEach(size => {
      if (!updatedChart.sizes[size]) {
        updatedChart.sizes[size] = {};
      }
      updatedChart.sizes[size][newMeasurement.name] = "";
    });

    onChange(updatedChart);
    setNewMeasurement({ name: "", unit: "cm" });
  };

  const removeMeasurement = (measurementName: string) => {
    const updatedChart = {
      ...sizeChart,
      measurements: sizeChart.measurements.filter(m => m.name !== measurementName),
    };

    // Remove this measurement from all sizes
    Object.keys(updatedChart.sizes).forEach(size => {
      delete updatedChart.sizes[size][measurementName];
    });

    onChange(updatedChart);
  };

  const updateMeasurementValue = (size: string, measurementName: string, value: string) => {
    const updatedChart = {
      ...sizeChart,
      sizes: {
        ...sizeChart.sizes,
        [size]: {
          ...sizeChart.sizes[size],
          [measurementName]: value,
        },
      },
    };

    onChange(updatedChart);
  };

  const clearSizeChart = () => {
    onChange(null);
  };

  const hasData = sizeChart.measurements.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Size Chart</CardTitle>
          {hasData && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSizeChart}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus Size Chart
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Measurement Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label htmlFor="measurement-name">Nama Pengukuran</Label>
              <Input
                id="measurement-name"
                value={newMeasurement.name}
                onChange={(e) => setNewMeasurement(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Chest, Waist, Length"
              />
            </div>
            <div className="w-24">
              <Label htmlFor="measurement-unit">Unit</Label>
              <Input
                id="measurement-unit"
                value={newMeasurement.unit}
                onChange={(e) => setNewMeasurement(prev => ({ ...prev, unit: e.target.value }))}
                placeholder="cm"
              />
            </div>
            <Button
              type="button"
              onClick={addMeasurement}
              className="mt-6"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah
            </Button>
          </div>
        </div>

        {/* Current Measurements */}
        {sizeChart.measurements.length > 0 && (
          <div className="space-y-2">
            <Label>Pengukuran Saat Ini:</Label>
            <div className="flex flex-wrap gap-2">
              {sizeChart.measurements.map((measurement, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-2">
                  {measurement.name} ({measurement.unit})
                  <button
                    type="button"
                    onClick={() => removeMeasurement(measurement.name)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Size Chart Table */}
        {hasData && availableSizes.length > 0 && (
          <div className="space-y-2">
            <Label>Size Chart:</Label>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Size</TableHead>
                    {sizeChart.measurements.map((measurement) => (
                      <TableHead key={measurement.name} className="font-semibold">
                        {measurement.name} ({measurement.unit})
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableSizes.map((size) => (
                    <TableRow key={size}>
                      <TableCell className="font-medium">{size}</TableCell>
                      {sizeChart.measurements.map((measurement) => (
                        <TableCell key={measurement.name}>
                          <Input
                            value={sizeChart.sizes[size]?.[measurement.name] || ""}
                            onChange={(e) => updateMeasurementValue(size, measurement.name, e.target.value)}
                            placeholder="e.g., 90-95"
                            className="w-20 text-center"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Tip: Gunakan format range seperti "90-95" atau nilai tunggal seperti "92"
            </p>
          </div>
        )}

        {!hasData && (
          <div className="text-center py-8 text-muted-foreground">
            <Edit2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Belum ada pengukuran ditambahkan</p>
            <p className="text-sm">Tambahkan pengukuran untuk membuat size chart</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
