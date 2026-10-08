import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { FileQuestion, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="relative flex min-h-[max(884px,100dvh)] items-center justify-center bg-stitch-bg px-4 font-sans text-white antialiased">
      <div className="relative z-10 w-full max-w-md text-center">
        <div className="relative overflow-hidden rounded-[32px] border border-stitch-border bg-stitch-card p-8 shadow-xl">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-stitch-accent/10 blur-2xl" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-stitch-border bg-stitch-pill/60 text-stitch-accent shadow-inner">
              <FileQuestion className="h-8 w-8" aria-hidden="true" />
            </div>
            <h1 className="mb-2 text-4xl font-bold tracking-tight text-white">404</h1>
            <p className="mb-2 text-lg font-medium text-white">Page not found</p>
            <p className="mb-6 text-sm text-stitch-muted">
              The page you are looking for doesn't exist or has been moved.
            </p>
            <Link
              to="/"
              aria-label="Return to portfolio overview"
              className="inline-flex items-center gap-2 rounded-full bg-stitch-accent px-5 py-2.5 text-sm font-semibold text-black shadow-md transition-all duration-150 hover:bg-stitch-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stitch-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-stitch-bg active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Return to portfolio
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
