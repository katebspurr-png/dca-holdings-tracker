import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="flex min-h-[max(884px,100dvh)] items-center justify-center bg-stitch-bg px-4 font-sans text-white antialiased">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">404</h1>
        <p className="mb-6 text-xl text-stitch-muted">Oops! Page not found</p>
        <Button
          asChild
          className="bg-stitch-accent text-black hover:bg-stitch-accent/90 active:scale-95 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-stitch-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-stitch-bg"
        >
          <Link to="/" aria-label="Return to portfolio">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to portfolio
          </Link>
        </Button>
      </div>
    </main>
  );
};

export default NotFound;
