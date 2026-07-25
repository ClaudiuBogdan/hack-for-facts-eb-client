import { ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ParliamentMember } from "@/schemas/parliament";
import { formatMemberName } from "../lib/formatting";
import { useParliamentMemberProfile } from "../hooks/use-parliament-data";
import { memberDetailNoticeClassName } from "../lib/member-detail-theme";
import { MemberProfileActivityRow } from "./member-profile-activity-row";
import { MemberProfileSectionHeader } from "./member-profile-section-header";
import { ParliamentInlineLoadError } from "./parliament-load-error-page";

type Props = {
  readonly member: ParliamentMember;
};

function formatActivityDate(isoDate: string): string {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(isoDate));
}

/** Registered interests tab */
export function MemberIntereseTab({ member }: Props) {
  const { data, isLoading, isError, refetch } = useParliamentMemberProfile(
    member.memberId,
  );
  const memberName = formatMemberName(member.firstName, member.lastName);

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-none" />;
  }

  if (isError) {
    return (
      <MemberProfileSectionHeader
        title="Declarații de interese"
        intro={`Declarațiile de interese publicate de ${memberName}, conform procedurilor camerei.`}
      >
        <ParliamentInlineLoadError
          title="Declarațiile nu au putut fi încărcate"
          description="O eroare de citire nu înseamnă că nu există declarații publicate."
          onRetry={() => void refetch()}
        />
      </MemberProfileSectionHeader>
    );
  }

  const declarations = data?.interestDeclarations ?? [];

  return (
    <MemberProfileSectionHeader
      title="Declarații de interese"
      intro={`Declarațiile de interese publicate de ${memberName}, conform procedurilor camerei.`}
    >
      <aside className={memberDetailNoticeClassName}>
        <p>
          Declarațiile includ funcții, activități profesionale și alte situații
          relevante pentru transparența mandatului parlamentar.
        </p>
      </aside>

      <div className="space-y-4">
        {declarations.length > 0 ? (
          declarations.map((entry) => (
            <div key={entry.declarationId} className="space-y-2">
              <MemberProfileActivityRow
                title={entry.category}
                meta={[
                  entry.registeredAt
                    ? `Înregistrată ${formatActivityDate(entry.registeredAt)}`
                    : undefined,
                  entry.description,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                {...(entry.fileUrl
                  ? {
                      trailing: (
                        <a
                          href={entry.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-[#1d70b8] underline underline-offset-2 hover:text-[#1d70b8]/80"
                        >
                          Deschide declarația
                          <ExternalLink
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden
                          />
                        </a>
                      ),
                    }
                  : {})}
              />
            </div>
          ))
        ) : (
          <p className="text-base leading-7 text-[#505a5f]">
            Nu există declarații publicate pentru acest parlamentar.
          </p>
        )}
      </div>
    </MemberProfileSectionHeader>
  );
}
