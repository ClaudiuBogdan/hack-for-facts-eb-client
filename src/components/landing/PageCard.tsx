import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type PageCardProps = {
  readonly title: string;
  readonly description: string;
  readonly to: "/" | "/map" | "/charts" | "/budget-explorer" | "/entity-analytics";
  readonly image: string;
  readonly imageAlt?: string;
  /**
   * Additional className passed to the root element.
   */
  readonly className?: string;
};

/**
 * PageCard component displayed on the landing page. Shows a text area on the left
 * and a blurred preview image on the right, inviting the user to navigate to
 * the corresponding section.
 */
export function PageCard({
  title,
  description,
  to,
  image,
  imageAlt,
  className,
}: PageCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        "group relative block h-full w-full overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-100 ease-in-out hover:shadow-xl hover:scale-[1.01] dark:hover:bg-slate-700 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-600",
        className,
      )}
    >
      <div className="absolute inset-0 z-0">
        <img
          src={image}
          alt={imageAlt || title}
          loading="lazy"
          className="absolute right-0 top-1/2 h-[150%] w-auto max-w-none -translate-y-1/2 translate-x-1/4 transform object-cover opacity-50 blur-[0.01px] transition-all duration-500 group-hover:opacity-100 group-hover:blur-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/70" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-center p-8 text-left md:w-3/5">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">
          {title}
        </h3>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </div>
    </Link>
  );
}
