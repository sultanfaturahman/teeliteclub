import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const AccountSkeleton = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-9 w-32 mb-8" />
      
      {/* Tabs skeleton */}
      <div className="w-full">
        <div className="grid w-full grid-cols-2 h-10 mb-6">
          <Skeleton className="h-full rounded-r-none" />
          <Skeleton className="h-full rounded-l-none" />
        </div>
        
        {/* Profile tab content skeleton */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const AccountOrdersSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-0">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  );
};