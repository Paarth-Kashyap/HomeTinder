import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PropertyCard } from './PropertyCard';
import { useProperties } from '../hooks/useProperties';
import { saveUserPreference } from '../lib/supabase';

export const PropertySwiper: React.FC = () => {
  const { data: properties, isLoading, error } = useProperties();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedProperties, setSwipedProperties] = useState<Set<string>>(new Set());

  // Filter out already swiped properties
  const availableProperties = properties?.filter(
    (property) => !swipedProperties.has(property.mls_number)
  ) || [];

  const currentProperty = availableProperties[currentIndex];

  const handleSwipe = (_direction: 'left' | 'right') => {
    if (!currentProperty) return;
    
    setSwipedProperties(prev => new Set([...prev, currentProperty.mls_number]));
    setCurrentIndex(prev => prev + 1);
  };

  const handleLike = async () => {
    if (!currentProperty) return;
    
    try {
      await saveUserPreference(currentProperty.mls_number, 'like');
    } catch (error) {
      console.error('Failed to save like:', error);
    }
  };

  const handleDislike = async () => {
    if (!currentProperty) return;
    
    try {
      await saveUserPreference(currentProperty.mls_number, 'dislike');
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

  if (availableProperties.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏠</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No More Properties!</h2>
          <p className="text-gray-600 mb-6">You've seen all available properties.</p>
          <button
            onClick={() => {
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
      <div className="max-w-md mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">HomeTinder</h1>
          <p className="text-gray-600">
            {availableProperties.length} properties remaining
          </p>
        </div>

        {/* Property Cards */}
        <div className="relative h-[600px]">
          <AnimatePresence>
            {currentProperty && (
              <motion.div
                key={currentProperty.mls_number}
                className="absolute inset-0"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <PropertyCard
                  property={currentProperty}
                  onSwipe={handleSwipe}
                  onLike={handleLike}
                  onDislike={handleDislike}
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
