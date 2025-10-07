import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PropertyCard } from "./PropertyCard";
import { saveUserProperties, fetchUserFeed } from "../lib/supabase";
import type { Listing } from "../types";

export const PropertySwiper: React.FC = () => {
  const [properties, setProperties] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentProperty = properties[currentIndex];
  const nextProperty = properties[currentIndex + 1];

  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchUserFeed();
      setProperties(data || []);
      setCurrentIndex(0);
    } catch (err: any) {
      console.error("❌ Failed to fetch properties:", err);
      setError("Could not load properties.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleSwipe = async (direction: "left" | "right") => {
    if (!currentProperty) return;

    if (direction === "right") await handleLike();
    else await handleDislike();

    setCurrentIndex((prev) => prev + 1);

    if (currentIndex + 2 >= properties.length) await fetchFeed();
  };

  const handleLike = async () => {
    if (currentProperty) {
      try {
        await saveUserProperties(currentProperty.mls_number, "liked");
      } catch (err) {
        console.error("❌ Failed to save like:", err);
      }
    }
  };

  const handleDislike = async () => {
    if (currentProperty) {
      try {
        await saveUserProperties(currentProperty.mls_number, "disliked");
      } catch (err) {
        console.error("❌ Failed to save dislike:", err);
      }
    }
  };

  const ThemeShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-secondary-50" />
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary-200 blur-3xl opacity-40" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-secondary-200 blur-3xl opacity-40" />
      <div className="relative z-10">{children}</div>
    </div>
  );

  if (isLoading)
    return (
      <ThemeShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </ThemeShell>
    );

  if (error)
    return (
      <ThemeShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-red-600">{error}</div>
          <button onClick={fetchFeed} className="btn-primary ml-4">
            Retry
          </button>
        </div>
      </ThemeShell>
    );

  if (!properties.length)
    return (
      <ThemeShell>
        <div className="min-h-screen flex flex-col items-center justify-center">
          <div className="text-6xl mb-3">🏠</div>
          <p>No more properties available!</p>
          <button onClick={fetchFeed} className="btn-primary mt-4">
            Reload
          </button>
        </div>
      </ThemeShell>
    );

  return (
    <ThemeShell>
      <div className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600">
              Discover Your Next Home
            </h1>
            {/* <p className="text-gray-600 mt-2">
              {properties.length - currentIndex} properties remaining
            </p> */}
          </div>

          {/* Card Stack */}
          <div
            className="relative mx-auto w-full max-w-[min(92vw,860px)] overflow-visible"
            style={{ height: "clamp(420px, 80vh, 880px)" }}
          >
            {/* Next card animation */}
            <AnimatePresence mode="wait">
            {currentProperty && (
              <motion.div
                key={nextProperty.mls_number}
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.7, y: -80 }}
                animate={{ opacity: 1, scale: 0.9, y: -80 }}
                exit={{ opacity: 0, scale: 0.7, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 25,
                  duration: 0.4,
                }}
                style={{
                  transform: "translateY(10px)",
                  filter: "grayscale(100%) brightness(95%)",
                  zIndex: 1,
                  pointerEvents: "none",
                }}
              >
                <PropertyCard
                  property={nextProperty}
                  onSwipe={handleSwipe}
                  onLike={handleLike}
                  onDislike={handleDislike}
                  isFront={false}
                />
              </motion.div>
            )}
            </AnimatePresence>
            {/* Front card */}
            <AnimatePresence initial={false}>
              {currentProperty && (
                <motion.div
                  key={currentProperty.mls_number}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ zIndex: 10 }}
                >
                  <PropertyCard
                    property={currentProperty}
                    onSwipe={handleSwipe}
                    onLike={handleLike}
                    onDislike={handleDislike}
                    isFront
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="text-center mt-8 text-sm text-gray-500">
            Swipe left to pass ❌ or right to like ❤️
          </div>
        </div>
      </div>
    </ThemeShell>
  );
};
