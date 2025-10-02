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

  // 🔹 Render states
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading properties...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Properties
          </h2>
          <p className="text-gray-600">{error}</p>
          <button onClick={fetchFeed} className="btn-primary mt-4">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!properties.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏠</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
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
    );
  }

  // 🔹 Main render
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            Discover Homes
          </h1>
          <p className="text-gray-600">
            {properties.length - currentIndex} properties remaining
          </p>
        </div>

        {/* Property Cards */}
        <div className="relative h-[75vh] max-h-[900px]">
          {/* Background queued cards */}
          {queue.map((property, idx) => {
            const translateX = 40 + idx * 28;
            const translateY = 30 + idx * 22;
            const rotate = -6 + idx * 3;
            const scale = 0.86 - idx * 0.08;
            const opacity = 0.65 - idx * 0.1;
            return (
              <div
                key={property.mls_number}
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scale})`,
                  transformOrigin: "center top",
                  zIndex: 1 + idx,
                  opacity,
                  filter: "saturate(0.9) contrast(0.98)",
                }}
              >
                <PropertyCard
                  property={property}
                  onSwipe={() => {}}
                  onLike={() => {}}
                  onDislike={() => {}}
                  isFront={false}
                />
              </div>
            );
          })}

          {/* Front card */}
          <AnimatePresence initial={false}>
            {currentProperty && (
              <motion.div
                key={currentProperty.mls_number}
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
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

        {/* Instructions */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Swipe right to like ❤️ or left to pass ❌</p>
        </div>
      </div>
    </div>
  );
};
