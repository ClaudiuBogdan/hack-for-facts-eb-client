import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { EntitySearchInput } from "@/components/entities/EntitySearchInput";

export const Route = createLazyFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800">
      {/* Optional: Navbar placeholder */}
      {/* <header className="p-4">
        <nav className="container mx-auto flex justify-between items-center">
          <span className="text-xl font-bold text-slate-700 dark:text-slate-200">Graph Gurus</span>
          <div> Nav links </div> 
        </nav>
      </header> */}

      <main className="flex-grow flex items-start justify-center p-4">
        <div className="container mx-auto flex flex-col items-center text-center space-y-10 py-16 md:py-24">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Financial Data Explorer
          </h1>
          <p className="max-w-2xl text-lg sm:text-xl text-slate-600 dark:text-slate-300">
            Search and analyze public spending data for entities across Romania.
          </p>

          <div className="w-full max-w-2xl lg:max-w-3xl mt-8">
            <EntitySearchInput
              placeholder="Enter entity name or CUI..."
            />
          </div>

          {/* Placeholder for maybe some quick link cards or stats if needed later */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            <Link to="/data-discovery" className="p-6 bg-white dark:bg-slate-800/50 rounded-xl shadow-md text-left">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Explore Data</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Advanced filtering & analysis.</p>
            </Link>

            <Link to="/map" className="p-6 bg-white dark:bg-slate-800/50 rounded-xl shadow-md text-left">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Map</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Explore spending by UAT.</p>
            </Link>
          </div>

        </div>
      </main>

      {/* Optional: Footer placeholder */}
      {/* <footer className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
        © {new Date().getFullYear()} Graph Gurus. All rights reserved.
      </footer> */}
    </div>
  );
}
