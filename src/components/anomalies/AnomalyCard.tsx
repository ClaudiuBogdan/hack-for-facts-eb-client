import { formatDistanceToNow } from "date-fns";
import { Anomaly } from "@/types/anomaly";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

type AnomalyCardProps = {
  anomaly: Anomaly;
};

export function AnomalyCard({ anomaly }: AnomalyCardProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const getSeverityIcon = (severity: Anomaly["severity"]) => {
    switch (severity) {
      case "low":
        return <Info className="h-4 w-4" />;
      case "medium":
        return <AlertTriangle className="h-4 w-4" />;
      case "high":
        return <AlertCircle className="h-4 w-4" />;
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: Anomaly["severity"]) => {
    switch (severity) {
      case "low":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20";
      case "high":
        return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20";
      case "critical":
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
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

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md hover:border-primary/50 cursor-pointer group">
      <Link
        to="/anomalies/$anomalyId"
        params={{ anomalyId: anomaly.id }}
        className="block"
      >
        <CardHeader className="pb-2 flex flex-row justify-between">
          <div>
            <div className="font-semibold text-lg group-hover:text-primary">
              {anomaly.title}
            </div>
            <div className="text-muted-foreground text-sm">
              {anomaly.entity} •{" "}
              {formatDistanceToNow(new Date(anomaly.date), { addSuffix: true })}
            </div>
          </div>
          <div className="flex items-start gap-2">
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
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-2">{anomaly.description}</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{anomaly.category}</Badge>
            </div>
            <div className="font-medium">
              Amount:{" "}
              <span className="text-primary">
                {formatCurrency(anomaly.amount, anomaly.currency)}
              </span>
            </div>
            <div className="text-muted-foreground">
              Source: {anomaly.source}
            </div>
            <div className="flex items-center gap-1 text-primary ml-auto">
              <span>View details</span>
              <ExternalLink className="h-3 w-3" />
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
