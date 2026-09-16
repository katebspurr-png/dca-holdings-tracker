import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, FileQuestion } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="flex min-h-[max(884px,100dvh)] items-center justify-center bg-stitch-bg px-4 font-sans text-white antialiased">
      <div className="mx-auto max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-stitch-border bg-stitch-pill text-stitch-accent">
          <FileQuestion className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-white">404</h1>
        <h2 className="mb-2 text-xl font-semibold text-white">Page not found</h2>
        <p className="mb-6 text-sm leading-relaxed text-stitch-muted">
          The page you are looking for doesn't exist or may have been moved.
        </p>
        <Link
          to="/"
          aria-label="Return to portfolio dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-stitch-accent px-5 py-2.5 text-sm font-semibold text-black transition-all duration-150 hover:bg-stitch-accent/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stitch-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-stitch-bg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Return to portfolio
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
