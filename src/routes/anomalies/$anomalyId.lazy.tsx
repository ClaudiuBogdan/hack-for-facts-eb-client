import { useEffect, useState } from "react";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { Anomaly } from "@/types/anomaly";
import { getAnomalies } from "@/lib/api/anomalies";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Building,
  Calendar,
  Tag,
  CreditCard,
  FileText,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format } from "date-fns";
import { createLogger } from "@/lib/logger";

const logger = createLogger("anomaly-detail");

export const Route = createLazyFileRoute("/anomalies/$anomalyId")({
  component: AnomalyDetailPage,
});

function AnomalyDetailPage() {
  const { anomalyId } = Route.useParams();
  const navigate = useNavigate();
  const [anomaly, setAnomaly] = useState<Anomaly | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAnomaly = async () => {
      try {
        setLoading(true);
        const anomalies = await getAnomalies({
          filters: {
            status: "all",
            severity: "all",
            dateRange: { from: null, to: null },
            searchQuery: "",
            category: [],
          },
        });
        const foundAnomaly = anomalies.find((a) => a.id === anomalyId);

        if (foundAnomaly) {
          setAnomaly(foundAnomaly);
        } else {
          throw new Error("Anomaly not found");
        }
      } catch (err) {
        logger.error("Failed to fetch anomaly", { id: anomalyId, error: err });
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchAnomaly();
  }, [anomalyId]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const getSeverityIcon = (severity: Anomaly["severity"]) => {
    switch (severity) {
      case "low":
        return <Info className="h-5 w-5" />;
      case "medium":
        return <AlertTriangle className="h-5 w-5" />;
      case "high":
        return <AlertCircle className="h-5 w-5" />;
      case "critical":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: Anomaly["severity"]) => {
    switch (severity) {
      case "low":
        return "bg-blue-500/10 text-blue-500";
      case "medium":
        return "bg-yellow-500/10 text-yellow-500";
      case "high":
        return "bg-orange-500/10 text-orange-500";
      case "critical":
        return "bg-red-500/10 text-red-500";
      default:
        return "";
    }
  };

  const getStatusColor = (status: Anomaly["status"]) => {
    switch (status) {
      case "new":
        return "bg-blue-500/10 text-blue-500";
      case "investigating":
        return "bg-yellow-500/10 text-yellow-500";
      case "resolved":
        return "bg-green-500/10 text-green-500";
      default:
        return "";
    }
  };

  const handleBack = () => {
    navigate({ to: "/anomalies" });
  };

  // Mock related entities data - in a real app, this would come from the API
  const relatedEntitiesData = [
    {
      id: "entity1",
      name: anomaly?.entity || "",
      type: "Organization",
      involvement: "Primary Entity",
    },
    {
      id: "entity2",
      name: "Ministry of Finance",
      type: "Authority",
      involvement: "Oversight",
    },
    {
      id: "entity3",
      name: "Local Contractor Inc.",
      type: "Vendor",
      involvement: "Recipient",
    },
  ];

  // Mock timeline data - in a real app, this would come from the API
  const timelineData = [
    {
      id: "1",
      date: "2023-11-20T10:30:00Z",
      event: "Anomaly detected",
      description: "System flagged unusual spending pattern",
    },
    {
      id: "2",
      date: "2023-11-22T14:15:00Z",
      event: "Initial investigation started",
      description: "Assigned to financial audit team",
    },
    {
      id: "3",
      date: anomaly?.date || new Date().toISOString(),
      event: "Additional information requested",
      description: "Requested transaction history and vendor details",
    },
  ];

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1" disabled>
            <ArrowLeft className="h-4 w-4" />
            Back to Anomalies
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div>
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !anomaly) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Anomalies
          </Button>
        </div>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>
              {error?.message || "Failed to load anomaly details"}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={handleBack}>Return to Anomalies List</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Anomalies
        </Button>
      </div>

      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {anomaly.title}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getStatusColor(anomaly.status)}>
                {anomaly.status === "new" && "New"}
                {anomaly.status === "investigating" && "Investigating"}
                {anomaly.status === "resolved" && (
                  <>
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Resolved
                  </>
                )}
              </Badge>
              <Badge
                variant="outline"
                className={getSeverityColor(anomaly.severity)}
              >
                {getSeverityIcon(anomaly.severity)}
                <span className="ml-1">{anomaly.severity}</span>
              </Badge>
              <p className="text-muted-foreground">
                Detected{" "}
                {formatDistanceToNow(new Date(anomaly.date), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(anomaly.amount, anomaly.currency)}
            </div>
            <div className="text-sm text-muted-foreground">
              Anomalous Amount
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main anomaly information */}
          <Card>
            <CardHeader>
              <CardTitle>Anomaly Details</CardTitle>
              <CardDescription>
                Detailed information about this spending anomaly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Description</h3>
                <p>{anomaly.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-2">
                  <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium">Entity</div>
                    <div>{anomaly.entity}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium">Date</div>
                    <div>{format(new Date(anomaly.date), "PPP")}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium">Category</div>
                    <div>{anomaly.category}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium">Amount</div>
                    <div>
                      {formatCurrency(anomaly.amount, anomaly.currency)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium">Source</div>
                    <div>{anomaly.source}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div
                    className={`rounded-full p-1 ${getSeverityColor(anomaly.severity)}`}
                  >
                    {getSeverityIcon(anomaly.severity)}
                  </div>
                  <div>
                    <div className="font-medium">Risk Level</div>
                    <div className="capitalize">{anomaly.severity}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Investigation Timeline</CardTitle>
              <CardDescription>
                Chronological events related to this anomaly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {timelineData.map((item, index) => (
                  <div key={item.id} className="relative flex gap-4">
                    {index < timelineData.length - 1 && (
                      <div className="absolute left-[17px] top-[30px] bottom-0 w-[2px] bg-border" />
                    )}
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1 pt-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{item.event}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(item.date), "PP")}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar information */}
        <div className="space-y-6">
          {/* Related entities */}
          <Card>
            <CardHeader>
              <CardTitle>Related Entities</CardTitle>
              <CardDescription>
                Organizations and individuals involved
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {relatedEntitiesData.map((entity) => (
                <div
                  key={entity.id}
                  className="flex justify-between items-start pb-3 border-b last:border-0 last:pb-0"
                >
                  <div>
                    <div className="font-medium">{entity.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {entity.type}
                    </div>
                  </div>
                  <Badge variant="outline">{entity.involvement}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Additional information from SQL tables */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Classification</CardTitle>
              <CardDescription>
                Based on Romanian budgetary classification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm font-medium">
                  Functional Classification
                </div>
                <div className="text-sm flex justify-between">
                  <span>860200</span>
                  <span className="text-muted-foreground">
                    R&D in Agriculture
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">
                  Economic Classification
                </div>
                <div className="text-sm flex justify-between">
                  <span>200130</span>
                  <span className="text-muted-foreground">
                    Other goods and services
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">Funding Source</div>
                <div className="text-sm flex justify-between">
                  <span>G</span>
                  <span className="text-muted-foreground">
                    Own revenues and subsidies
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" size="sm" className="w-full gap-1">
                <ExternalLink className="h-3 w-3" />
                <span>View Raw Transactions</span>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
