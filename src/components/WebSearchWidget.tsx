import { Globe } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { WebSearchBar } from "@/components/WebSearchBar";

export function WebSearchWidget() {
  return (
    <Card className="h-full border border-border bg-card shadow-xs rounded-2xl flex flex-col justify-between overflow-hidden">
      <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-2.5 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-500" />
          <span>Busca Web</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0 sm:pt-0 flex-1 flex flex-col justify-center">
        <WebSearchBar modo="widget" />
      </CardContent>
    </Card>
  );
}
