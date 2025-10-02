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
  const queue = properties.slice(currentIndex + 1, currentIndex + 4);

  // 🔹 Fetch feed from Edge Function
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

  const handleSwipe = async (_direction: "left" | "right") => {
    if (!currentProperty) return;

    setCurrentIndex((prev) => prev + 1);

    // If near the end, refresh with a new batch
    if (currentIndex + 2 >= properties.length) {
      await fetchFeed();
    }
  };

  const handleLike = async () => {
    if (currentProperty) {
      try {
        await saveUserProperties(currentProperty.mls_number, "liked");
      } catch (error) {
        console.error("❌ Failed to save like:", error);
      }
    }
  };

  const handleDislike = async () => {
    if (currentProperty) {
      try {
        await saveUserProperties(currentProperty.mls_number, "disliked");
      } catch (error) {
        console.error("❌ Failed to save dislike:", error);
      }
    }
  };

  // --- Themed wrappers for all states ---
  const ThemeShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background gradient + blobs */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-secondary-50" />
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary-200 blur-3xl opacity-40" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-secondary-200 blur-3xl opacity-40" />
      <div className="relative z-10">{children}</div>
    </div>
  );

  if (isLoading) {
    return (
      <ThemeShell>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center card rounded-2xl border border-gray-200 bg-white/90 shadow-sm p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading properties...</p>
          </div>
        </div>
      </ThemeShell>
    );
  }

  if (error) {
    return (
      <ThemeShell>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center card rounded-2xl border border-gray-200 bg-white/90 shadow-sm p-10 max-w-md">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600 mb-2">
              Error Loading Properties
            </h2>
            <p className="text-gray-600">{error}</p>
            <button onClick={fetchFeed} className="btn-primary mt-4">
              Try Again
            </button>
          </div>
        </div>
      </ThemeShell>
    );
  }

  if (!properties.length) {
    return (
      <ThemeShell>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center card rounded-2xl border border-gray-200 bg-white/90 shadow-sm p-10 max-w-md">
            <div className="text-6xl mb-4">🏠</div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600 mb-2">
              No More Properties!
            </h2>
            <p className="text-gray-600 mb-6">
              You've seen all available properties.
            </p>
            <button onClick={fetchFeed} className="btn-primary">
              Start Over
            </button>
          </div>
        </div>
      </ThemeShell>
    );
  }

  // 🔹 Main render (theme + responsive stage that prevents overlap)
  return (
    <ThemeShell>
      <div className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600 mb-2">
              Discover Your Next Home
            </h1>
            <p className="text-gray-600">
              {properties.length - currentIndex} properties remaining
            </p>
          </div>

          {/* Property Stage (responsive, non-overlapping) */}
          <div
            className="relative mx-auto w-full max-w-[min(92vw,860px)]"
            style={{
              // Height scales with viewport but stays within sensible bounds
              height: "clamp(420px, 72vh, 880px)",
            }}
          >
            {/* Background queued cards */}
            {queue.map((property, idx) => {
              // Softer offsets to avoid pushing out of stage on small screens
              const translateX = 24 + idx * 20;
              const translateY = 18 + idx * 16;
              const rotate = -4 + idx * 2.5;
              const scale = 0.92 - idx * 0.06;
              const opacity = 0.7 - idx * 0.1;
              return (
                <div
                  key={property.mls_number}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scale})`,
                    transformOrigin: "center top",
                    zIndex: 1 + idx,
                    opacity,
                    filter: "saturate(0.95) contrast(0.98)",
                  }}
                >
                  <div className="h-full w-full max-h-full max-w-full flex items-center justify-center p-2">
                    <PropertyCard
                      property={property}
                      onSwipe={() => {}}
                      onLike={() => {}}
                      onDislike={() => {}}
                      isFront={false}
                    />
                  </div>
                </div>
              );
            })}

            {/* Front card */}
            <AnimatePresence initial={false}>
              {currentProperty && (
                <motion.div
                  key={currentProperty.mls_number}
                  className="absolute inset-0 flex items-center justify-center p-2"
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  style={{ zIndex: 10 }}
                >
                  <div className="h-full w-full max-h-full max-w-full flex items-center justify-center">
                    <PropertyCard
                      property={currentProperty}
                      onSwipe={handleSwipe}
                      onLike={handleLike}
                      onDislike={handleDislike}
                      isFront
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Instructions */}
          <div className="text-center mt-6 sm:mt-8 text-sm text-gray-500">
            <p>Swipe right to like ❤️ or left to pass ❌</p>
          </div>
        </div>
      </div>
    </ThemeShell>
  );
};
