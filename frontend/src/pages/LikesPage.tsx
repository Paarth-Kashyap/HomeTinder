import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { getUserProperties, removeUserProperty } from "../lib/supabase"; // <-- edge function wrapper
import type { Listing } from "../types";

export const LikesPage: React.FC = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"likes" | "dislikes">("likes");

  useEffect(() => {
    const fetchProperties = async () => {
      if (!user) return;

      try {
        const data = await getUserProperties();
        // unwrap to Listing shape
        const normalized: Listing[] = (data).map((item: any) => ({
          mls_number: item.property.mls_number,
          address: item.property.address,
          city: item.property.city,
          price: item.property.price,
          bedrooms: item.property.bedrooms,
          bathrooms: item.property.bathrooms,
          property_type: item.property.property_type,
          images: Array.isArray(item.property.media?.image_urls) ? item.property.media.image_urls : [],
          id: item.property.id,
          status: item.status,
          created_at: item.property.created_at,
        }));

        setProperties(normalized);
      } catch (error) {
        console.error("Failed to fetch liked/disliked properties:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [user]);

  const likedProperties = properties.filter((p: any) => p.status === "liked");
  const dislikedProperties = properties.filter((p: any) => p.status === "disliked");
  
  //remove listing from user_properties
  const handleRemove = async (mls_number: string) => {
    setProperties((prev) => prev.filter((p: any) => p.mls_number !== mls_number));
    try {
      console.log("mls_number", mls_number)
      await removeUserProperty(mls_number);
      console.log(`Property ${mls_number} removed successfully`);
    } catch (err) {
      console.error("Failed to remove property:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const renderCard = (p: any, isLiked: boolean) => {
    const parts = p.address.split(",");
    const street = parts[0] || "";
    const city = parts[1]?.trim() || "";
    const provinceAndPostal = parts[2]?.trim() || "";

    // Split province and postal (assumes format "ON L4E 0B6")
    const [province, ...postalParts] = provinceAndPostal.split(" ");
    const postal = postalParts.join(" "); // "L4E 0B6"

    return (
      <div key={p.id} className="bg-white p-6 rounded-lg shadow-sm">
        {p.images?.[0] && (
          <img
            src={p.images[0]}
            alt={`MLS #${p.mls_number}`}
            className="w-full h-48 object-cover rounded-md mb-4"
          />
        )}

        {/* Address as main heading */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-lg">{street}</h3>
          <button
            onClick={() => handleRemove(p.mls_number)}
            className="text-sm text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>

        {/* City + Province */}
        <p className="text-gray-700">
          {city}{city && province ? "," : ""} {province}
        </p>

        {/* Postal code on its own line */}
        {postal && <p className="text-gray-600">{postal}</p>}

        {/* MLS + liked/disliked */}
        <p className="text-sm text-gray-600 mt-1">
          MLS #{p.mls_number} • {isLiked ? "Liked" : "Disliked"} on{" "}
          {new Date(p.created_at).toLocaleDateString()}
        </p>

        {/* Price + bedrooms/bathrooms */}
        <p className="text-gray-800 mt-2">
          ${p.price?.toLocaleString()} • {p.bedrooms} bd • {p.bathrooms} ba
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Preferences</h1>
          <p className="text-gray-600">View your liked and disliked properties</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-200 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("likes")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === "likes"
                ? "bg-white text-primary-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            ❤️ Liked ({likedProperties.length})
          </button>
          <button
            onClick={() => setActiveTab("dislikes")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === "dislikes"
                ? "bg-white text-primary-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            ❌ Disliked ({dislikedProperties.length})
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === "likes"
            ? likedProperties.length === 0
              ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💔</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Liked Properties Yet</h3>
                  <p className="text-gray-600">Start swiping to find properties you love!</p>
                </div>
              )
              : likedProperties.map((p: any) => renderCard(p, true))
            : dislikedProperties.length === 0
              ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👍</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Disliked Properties</h3>
                  <p className="text-gray-600">You haven't disliked any properties yet.</p>
                </div>
              )
              : dislikedProperties.map((p: any) => renderCard(p, false))
          }
        </div>
      </div>
    </div>
  );
};
