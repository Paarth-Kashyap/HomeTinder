import React, { useState } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import type { Property } from '../types';

interface PropertyCardProps {
  property: Property;
  onSwipe: (direction: 'left' | 'right') => void;
  onLike: () => void;
  onDislike: () => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onSwipe,
  onLike,
  onDislike,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleDragEnd = (_event: any, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      onSwipe('right');
      onLike();
    } else if (info.offset.x < -threshold) {
      onSwipe('left');
      onDislike();
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev < property.images.length - 1 ? prev + 1 : 0
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev > 0 ? prev - 1 : property.images.length - 1
    );
  };

  return (
    <motion.div
      className="relative w-full max-w-sm mx-auto bg-white rounded-2xl shadow-xl overflow-hidden"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.05 }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
    >
      {/* Image Section */}
      <div className="relative h-80 bg-gray-200">
        {property.images.length > 0 ? (
          <>
            <img
              src={property.images[currentImageIndex]}
              alt={`${property.address} - Image ${currentImageIndex + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-house.svg';
              }}
            />
            
            {/* Image Navigation */}
            {property.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                >
                  ←
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                >
                  →
                </button>
                
                {/* Image Indicators */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  {property.images.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">🏠</div>
              <div>No images available</div>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-2xl font-bold text-gray-900">
            {formatPrice(property.price)}
          </h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {property.property_type}
          </span>
        </div>
        
        <h4 className="text-lg font-semibold text-gray-800 mb-1">
          {property.address}
        </h4>
        
        <p className="text-gray-600 mb-4">{property.city}</p>
        
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center">
            <span className="mr-1">🛏️</span>
            {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center">
            <span className="mr-1">🚿</span>
            {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
        <button
          onClick={() => {
            onSwipe('left');
            onDislike();
          }}
          className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg transition-colors"
        >
          ❌
        </button>
        <button
          onClick={() => {
            onSwipe('right');
            onLike();
          }}
          className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg transition-colors"
        >
          ❤️
        </button>
      </div>
    </motion.div>
  );
};
