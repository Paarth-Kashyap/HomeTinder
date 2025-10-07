import React, { useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from "framer-motion";
import type { Listing } from "../types";

interface PropertyCardProps {
  property: Listing;
  onSwipe: (direction: "left" | "right") => void;
  onLike: () => void;
  onDislike: () => void;
  isFront?: boolean;
  className?: string;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onSwipe,
  onLike,
  onDislike,
  isFront = true,
  className,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-400, 0, 400], [-15, 0, 15]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 500;

    // Swiped right
    if (info.offset.x > threshold) {
      animate(x, 500, { duration: 0.3, ease: "easeOut" });
      onSwipe("right");
      onLike(); 
      return;
    }

    // Swiped left
    if (info.offset.x < -threshold) {
      animate(x, -500, { duration: 0.3, ease: "easeOut" });
      onSwipe("left");
      onDislike();
      return;
  }

    // Not enough movement — snap back
    animate(x, 0, {
      type: "spring",
      stiffness: 300,
      damping: 30,
    });
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 0,
    }).format(price);

  const formatProvince = (code: string) => {
    const provinces: Record<string, string> = {
      AB: "Alberta",
      BC: "British Columbia",
      MB: "Manitoba",
      NB: "New Brunswick",
      NL: "Newfoundland and Labrador",
      NS: "Nova Scotia",
      ON: "Ontario",
      PE: "Prince Edward Island",
      QC: "Quebec",
      SK: "Saskatchewan",
      NT: "Northwest Territories",
      NU: "Nunavut",
      YT: "Yukon",
    };
    return provinces[code] || code;
  };

  const nextImage = () =>
    setCurrentImageIndex((prev) =>
      prev < property.images.length - 1 ? prev + 1 : 0
    );

  const prevImage = () =>
    setCurrentImageIndex((prev) =>
      prev > 0 ? prev - 1 : property.images.length - 1
    );

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      <motion.div
        className={`relative w-full bg-white rounded-3xl shadow-2xl overflow-hidden ${className || ""}`}
        drag={isFront ? "x" : false}
        dragConstraints={isFront ? { left: 0, right: 0 } : undefined}
        dragElastic={isFront ? 0.35 : undefined}
        onDragEnd={isFront ? handleDragEnd : undefined}
        whileDrag={isFront ? { scale: 1.15 } : undefined}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.75, opacity: 0 }}
        style={{
          pointerEvents: isFront ? "auto" : "none",
          x: isFront ? x : undefined,
          rotate: isFront ? rotate : undefined,
        }}
      >
        {/* Image */}
        <div className="relative h-[340px] sm:h-[420px] lg:h-[48vh] bg-gray-200">
          {property.images.length > 0 ? (
            <>
              <img
                src={property.images[currentImageIndex]}
                alt={`${property.address} - ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
                onError={(e) =>
                  ((e.target as HTMLImageElement).src = "/placeholder-house.svg")
                }
              />
              {property.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                  >
                    ←
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                  >
                    →
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
                    {property.images.map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i === currentImageIndex ? "bg-white" : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <span>No images available</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-5 lg:p-6 relative">
          <div className="absolute top-5 right-5 flex flex-col items-end space-y-1">
            <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded w-[90px] text-center truncate">
              {property.transaction}
            </span>
            <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded w-[90px] text-center truncate">
              {property.property_subtype}
            </span>
          </div>

          <h3 className="text-3xl lg:text-4xl font-extrabold text-gray-900">
            {formatPrice(property.price)}
          </h3>

          <div className="flex items-center space-x-6 text-lg text-gray-600 mt-2">
            <div className="flex items-center">
              <span className="mr-1">🛏️</span>
              {property.bedrooms} beds
            </div>
            <div className="flex items-center">
              <span className="mr-1">🚿</span>
              {property.bathrooms} baths
            </div>
          </div>

          <h4 className="text-xl lg:text-2xl font-semibold text-gray-800 mt-3">
            {property.address}, {property.city}, {formatProvince(property.province)}
          </h4>

          <p className="text-gray-600 text-base lg:text-lg">{property.postal}</p>

          <p className="text-gray-600 mt-3 text-sm">
            MLS® #: <span className="font-medium">{property.mls_number}</span>
          </p>
        </div>
      </motion.div>

      {/* Like / Dislike buttons */}
      {isFront && (
        <div className="flex justify-center mt-6 space-x-8">
          <button
            onClick={() => {
              animate(x, -500, { duration: 0.3, ease: "easeOut" });
              onSwipe("left");
              onDislike();
            }}
            className="bg-red-500 hover:bg-red-600 text-white p-5 rounded-full shadow-lg transition"
          >
            ❌
          </button>
          <button
            onClick={() => {
              animate(x, 500, { duration: 0.3, ease: "easeOut" });
              onSwipe("right");
              onLike();
            }}
            className="bg-green-500 hover:bg-green-600 text-white p-5 rounded-full shadow-lg transition"
          >
            ❤️
          </button>
        </div>
      )}
    </div>
  );
};
