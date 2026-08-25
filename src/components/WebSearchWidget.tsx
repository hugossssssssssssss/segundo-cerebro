import { Globe } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { WebSearchBar } from "@/components/WebSearchBar";
import { Badge } from "@/components/ui/badge";

export function WebSearchWidget() {
  return (
    <Card className="h-full border border-border/80 bg-card/95 backdrop-blur-xs shadow-xs flex flex-col justify-between overflow-hidden rounded-3xl p-1 sm:p-2">
      <CardHeader className="p-5 sm:p-6 pb-3 sm:pb-4 space-y-1.5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Globe size={18} />
            </div>
            <span>Busca Web Inteligente</span>
          </CardTitle>
          <Badge variant="outline" className="text-[11px] text-muted-foreground border-border/70 py-0.5 px-2 font-medium">
            Google • Bing • DuckDuckGo
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Pesquise diretamente na internet com filtros avançados de formato, site e datas sem complicação.
        </p>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 pt-0 sm:pt-0 flex-1 flex flex-col justify-start">
        <WebSearchBar modo="widget" />
      </CardContent>
    </Card>
  );
}
