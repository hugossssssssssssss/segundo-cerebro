import { Globe } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { WebSearchBar } from "@/components/WebSearchBar";
import { Badge } from "@/components/ui/badge";

export function WebSearchWidget() {
  return (
    <Card className="h-full border border-border/80 bg-card shadow-xs flex flex-col justify-between overflow-hidden">
      <CardHeader className="p-5 sm:p-6 pb-2 sm:pb-3 space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-blue-500" />
            <span>Busca Web Avançada</span>
          </CardTitle>
          <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">
            Dork Builder
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Pesquise no Google, Bing ou DuckDuckGo com filtros de site, formato e termos exatos.
        </p>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 pt-2 sm:pt-2 flex-1 flex flex-col justify-center">
        <WebSearchBar modo="widget" />
      </CardContent>
    </Card>
  );
}
