import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import qraftLogo from "@/assets/qraft-logo.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <img src={qraftLogo} alt="QRAFT.AI" className="h-14 mx-auto opacity-60" />
        <div>
          <h1 className="mb-2 text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">404</h1>
          <p className="mb-6 text-xl text-muted-foreground">Page not found</p>
          <a 
            href="/" 
            className="inline-block px-6 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
          >
            Return Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
