import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[max(884px,100dvh)] items-center justify-center bg-stitch-bg px-4 font-sans text-white antialiased">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">404</h1>
        <p className="mb-6 text-xl text-stitch-muted">Oops! Page not found</p>
        <Link
          to="/"
          className="text-stitch-accent underline underline-offset-2 transition-opacity hover:opacity-90"
        >
          Return to portfolio
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
