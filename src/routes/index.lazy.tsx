import { createLazyFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart3,
  AlertTriangle,
  ArrowRight,
  PieChart,
  Database,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="container mx-auto mt-12 p-4">
      <h1 className="text-3xl font-bold mb-8">Graph Gurus Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Anomaly Detection Card */}
        {/* <Card className="overflow-hidden transition-all hover:shadow-md hover:border-primary/50 group">
          <Link to="/anomalies" className="block">
            <CardHeader className="pb-2 space-y-1">
              <div className="flex items-center gap-2">
                <div className="bg-red-100 p-2 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <CardTitle className="group-hover:text-primary">
                  Detectare Anomalii
                </CardTitle>
              </div>
              <CardDescription>
                Identifică tranzacții suspecte și tipare neobișnuite în
                cheltuielile publice din România
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-0">
              <div className="grid grid-cols-2 gap-4 mt-2 mb-6">
                <div className="flex flex-col gap-1">
                  <div className="text-2xl font-bold">15</div>
                  <div className="text-sm text-muted-foreground">
                    Anomalii Noi
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-2xl font-bold">4</div>
                  <div className="text-sm text-muted-foreground">
                    Cazuri Critice
                  </div>
                </div>
              </div>
              <div className="h-[120px] flex justify-center items-center bg-muted/20 rounded-lg">
                <BarChart3 className="h-16 w-16 text-muted-foreground/50" />
              </div>
            </CardContent>
            <CardFooter className="pt-4">
              <div className="flex items-center gap-1 text-primary ml-auto">
                <span>Vezi anomalii</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </CardFooter>
          </Link>
        </Card> */}

        {/* Data Discovery Card */}
        <Card className="overflow-hidden transition-all hover:shadow-md hover:border-primary/50 group">
          <Link to="/data-discovery" className="block">
            <CardHeader className="pb-2 space-y-1">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Database className="h-5 w-5 text-blue-500" />
                </div>
                <CardTitle className="group-hover:text-primary">
                  Explorare Date
                </CardTitle>
              </div>
              <CardDescription>
                Analizează cheltuielile publice din județele României folosind
                filtre avansate și comenzi în limbaj natural
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-0">
              <div className="grid grid-cols-2 gap-4 mt-2 mb-6">
                <div className="flex flex-col gap-1">
                  <div className="text-2xl font-bold">41</div>
                  <div className="text-sm text-muted-foreground">Județe</div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-2xl font-bold">2M+</div>
                  <div className="text-sm text-muted-foreground">
                    Înregistrări
                  </div>
                </div>
              </div>
              <div className="h-[120px] flex justify-center items-center bg-muted/20 rounded-lg">
                <PieChart className="h-16 w-16 text-muted-foreground/50" />
              </div>
            </CardContent>
            <CardFooter className="pt-4">
              <div className="flex items-center gap-1 text-primary ml-auto">
                <span>Explorează date</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </CardFooter>
          </Link>
        </Card>
      </div>
    </div>
  );
}
