import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState("fadeIn");

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage("fadeOut");
    }
  }, [location, displayLocation]);

  useEffect(() => {
    if (transitionStage === "fadeOut") {
      const timeout = setTimeout(() => {
        setTransitionStage("fadeIn");
        setDisplayLocation(location);
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [transitionStage, location]);

  return (
    <div
      className={`${
        transitionStage === "fadeIn" ? "animate-fade-in" : "animate-fade-out"
      }`}
    >
      {children}
    </div>
  );
};
