import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[max(884px,100dvh)] items-center justify-center bg-stitch-bg px-4 font-sans text-white antialiased">
      <main className="flex flex-col items-center text-center">
        <h1 className="mb-2 font-[family-name:var(--font-heading)] text-6xl font-extrabold tracking-tight text-white">
          404
        </h1>
        <p className="mb-6 text-lg text-stitch-muted">Oops! Page not found</p>
        <Link
          to="/"
          aria-label="Return to portfolio overview"
          className="inline-flex items-center gap-2 rounded-xl border border-stitch-border bg-stitch-pill px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-stitch-card hover:text-stitch-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-stitch-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-stitch-bg active:scale-95"
        >
          <Home className="h-4 w-4 text-stitch-accent" aria-hidden="true" />
          <span>Return to portfolio</span>
        </Link>
      </main>
    </div>
  );
};

export default NotFound;
