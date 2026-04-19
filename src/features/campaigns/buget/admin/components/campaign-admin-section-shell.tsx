import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CampaignAdminSectionShellProps = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Optional action in the header (e.g. “View full page”). */
  readonly fullPageLink?: ReactNode;
  readonly children: ReactNode;
};

export function CampaignAdminSectionShell({
  id,
  title,
  description,
  fullPageLink,
  children,
}: CampaignAdminSectionShellProps) {
  const titleId = `${id}-title`;

  return (
    <section id={id} aria-labelledby={titleId} className="scroll-mt-24">
      <Card className="border-border/70 bg-card/80 shadow-none">
        <CardHeader className="gap-3 border-b border-border/60">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle>
                <h2 id={titleId} className="m-0 text-inherit">
                  {title}
                </h2>
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            {fullPageLink ? (
              <div className="lg:shrink-0">{fullPageLink}</div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-4">{children}</CardContent>
      </Card>
    </section>
  );
}
