import { Link } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  voteDetailCardClassName,
  voteDetailPageContainerClassName,
  VOTE_DETAIL_SURFACE,
} from "../lib/vote-detail-theme";
import { VoteDetailBreadcrumb } from "./vote-detail-breadcrumb";

type Props = {
  readonly title: string;
  readonly description: string;
  readonly onRetry?: () => void;
  readonly chamber?: "camera" | "senat";
  readonly breadcrumbLabel?: string;
  readonly className?: string;
};

type InlineProps = {
  readonly title: string;
  readonly description: string;
  readonly onRetry?: () => void;
  readonly className?: string;
};

/** Compact failure state for lists and profile tabs that stay inside a larger page. */
export function ParliamentInlineLoadError({
  title,
  description,
  onRetry,
  className,
}: InlineProps) {
  return (
    <div
      className={cn(
        "border-2 border-[#b1b4b6] bg-white px-5 py-6 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]",
        className,
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <ServerCrash
          className="mt-0.5 h-5 w-5 shrink-0 text-[#d4351c]"
          aria-hidden
        />
        <div>
          <p className="font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {title}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {description}
          </p>
          {onRetry ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-10 rounded-none border-2"
              onClick={onRetry}
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              Reîncearcă
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * "We could not load this" — as distinct from "this does not exist".
 *
 * Every Parliament detail route used to collapse both cases into the not-found
 * page: a GraphQL/network failure told the reader that a real member, bill or
 * division did not exist. That is the most damaging kind of wrong answer on a
 * public-accountability surface, and it also hides the outage. This state says
 * the read failed, keeps the record's existence an open question, and offers a
 * retry.
 */
export function ParliamentLoadErrorPage({
  title,
  description,
  onRetry,
  chamber,
  breadcrumbLabel = "Eroare de încărcare",
  className,
}: Props) {
  return (
    <div
      className={cn("min-h-screen", className)}
      style={{ backgroundColor: VOTE_DETAIL_SURFACE }}
    >
      {chamber ? (
        <VoteDetailBreadcrumb
          chamber={chamber}
          divisionLabel={breadcrumbLabel}
        />
      ) : (
        <nav
          className="py-3 text-sm text-white"
          style={{ backgroundColor: "#372554" }}
          aria-label="Breadcrumb"
        >
          <div className={voteDetailPageContainerClassName}>
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link
                  to="/parlament"
                  search={{ tab: "prezentare" }}
                  className="hover:underline"
                >
                  Parlament
                </Link>
              </li>
              <li aria-hidden className="opacity-70">
                ›
              </li>
              <li className="font-semibold" aria-current="page">
                {breadcrumbLabel}
              </li>
            </ol>
          </div>
        </nav>
      )}

      <div className={cn(voteDetailPageContainerClassName, "py-10 sm:py-12")}>
        <section
          className={cn(
            voteDetailCardClassName,
            "overflow-visible p-8 sm:p-10",
          )}
        >
          <div className="flex max-w-2xl flex-col gap-6 sm:flex-row sm:items-start">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#dee0e2] bg-[#fdf6f6] text-[#d4351c]"
              aria-hidden
            >
              <ServerCrash className="h-7 w-7" strokeWidth={2} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold uppercase tracking-wide text-[#d4351c]">
                Eroare temporară
              </p>
              <h1 className="mt-2 text-2xl font-bold leading-tight text-[#0b0c0c] sm:text-3xl dark:text-[var(--pnrr-fg)]">
                {title}
              </h1>
              <p className="mt-4 text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                {description}
              </p>

              {onRetry ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-8 h-10 rounded-none border-2 px-4 text-sm font-normal"
                  onClick={onRetry}
                >
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                  Reîncearcă
                </Button>
              ) : null}

              <Link
                to="/parlament"
                search={{ tab: "prezentare" }}
                className="mt-6 flex items-center gap-2 text-sm font-medium text-[#1d70b8] hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Înapoi la Parlament
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
