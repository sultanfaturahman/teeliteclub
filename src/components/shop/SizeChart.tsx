import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Ruler } from "lucide-react";

interface SizeChartData {
  measurements: Array<{
    name: string;
    unit: string;
  }>;
  sizes: Record<string, Record<string, string>>;
}

interface SizeChartProps {
  sizeChart: SizeChartData;
  availableSizes: string[];
}

export function SizeChart({ sizeChart, availableSizes }: SizeChartProps) {
  // Filter available sizes to only show those that exist in the size chart
  const displaySizes = availableSizes.filter(size => 
    sizeChart.sizes[size] && 
    Object.values(sizeChart.sizes[size]).some(value => value.trim() !== "")
  );

  if (!sizeChart.measurements.length || !displaySizes.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="h-5 w-5" />
          Size Chart
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Size</TableHead>
                {sizeChart.measurements.map((measurement) => (
                  <TableHead key={measurement.name} className="font-semibold text-center">
                    {measurement.name}
                    <span className="block text-xs font-normal text-muted-foreground">
                      ({measurement.unit})
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displaySizes.map((size) => (
                <TableRow key={size}>
                  <TableCell className="font-medium">{size}</TableCell>
                  {sizeChart.measurements.map((measurement) => (
                    <TableCell key={measurement.name} className="text-center">
                      {sizeChart.sizes[size]?.[measurement.name] || "-"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> All measurements are in the specified units. 
            For the best fit, please refer to this size chart before making your selection.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}