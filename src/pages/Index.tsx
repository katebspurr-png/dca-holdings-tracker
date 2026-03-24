import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="flex min-h-[max(884px,100dvh)] items-center justify-center bg-stitch-bg px-4 font-sans text-white antialiased">
      <div className="text-center">
        <h1 className="mb-4 text-3xl font-bold tracking-tight">PositionPilot</h1>
        <p className="mb-6 text-stitch-muted">This route is unused — open the app via the portfolio.</p>
        <Link to="/" className="text-stitch-accent underline underline-offset-2 hover:opacity-90">
          Go to portfolio
        </Link>
      </div>
    </div>
  );
};

export default Index;
