import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PropertyCard } from './PropertyCard';
import { useProperties } from '../hooks/useProperties';
import { saveUserProperties, supabase } from '../lib/supabase';

export const PropertySwiper: React.FC = () => {
  const { data: properties, isLoading, error, refreshRandomBatch } = useProperties();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedProperties, setSwipedProperties] = useState<Set<string>>(new Set());

  // Filter out already swiped properties
  const availableProperties = properties?.filter(
    (property) => !swipedProperties.has(property.mls_number)
  ) || [];

  const currentProperty = currentIndex < availableProperties.length ? availableProperties[currentIndex] : undefined;
  const queue = availableProperties.slice(currentIndex + 1, currentIndex + 4);

  const handleSwipe = async (_direction: 'left' | 'right') => {
    if (!currentProperty) return;
    
    setSwipedProperties(prev => new Set([...prev, currentProperty.mls_number]));
    setCurrentIndex(prev => prev + 1);

    // If we have less than 1 remaining in the queue, trigger fresh batch
    if (currentIndex + 2 >= availableProperties.length) {
      await refreshRandomBatch();
      setSwipedProperties(new Set());
      setCurrentIndex(0);
    }
  };

  const handleLike = async () => {
    if (!currentProperty) return;
    
    try {
      await saveUserProperties(currentProperty.mls_number, 'liked');
    } catch (error) {
      console.error('Failed to save like:', error);
    }
  };

  const handleDislike = async () => {
    if (!currentProperty) return;
    
    try {
      const { data } = await supabase.auth.getSession();
      console.log("ACCESS TOKEN:", data.session?.access_token);
      await saveUserProperties(currentProperty.mls_number, 'disliked');
    } catch (error) {
      console.error('Failed to save dislike:', error);
    }
  };

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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Properties</h2>
          <p className="text-gray-600">Please try again later.</p>
        </div>
      </div>
    );
  }

  if (!isLoading && availableProperties.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏠</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No More Properties!</h2>
          <p className="text-gray-600 mb-6">You've seen all available properties.</p>
          <button
            onClick={() => {
              refreshRandomBatch();
              setSwipedProperties(new Set());
              setCurrentIndex(0);
            }}
            className="btn-primary"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Discover Homes</h1>
          <p className="text-gray-600">
            {availableProperties.length} properties remaining
          </p>
        </div>

        {/* Property Cards */}
        <div className="relative h-[75vh] max-h-[900px]">
          {/* Background queued cards */}
          {queue.map((property, idx) => {
            const translateX = 40 + idx * 28; // px
            const translateY = 30 + idx * 22; // px
            const rotate = -6 + idx * 3; // deg
            const scale = 0.86 - idx * 0.08;
            const opacity = 0.65 - idx * 0.1;
            return (
              <div
                key={property.mls_number}
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scale})`,
                  transformOrigin: 'center top',
                  zIndex: 1 + idx,
                  opacity,
                  filter: 'saturate(0.9) contrast(0.98)',
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
