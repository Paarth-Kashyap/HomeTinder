import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getUserProperties } from '../lib/supabase'; // <-- use the edge function wrapper
import type { Property } from '../types';

export const LikesPage: React.FC = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'likes' | 'dislikes'>('likes');

  useEffect(() => {
    const fetchProperties = async () => {
      if (!user) return;

      try {
        const data = await getUserProperties(); 
        setProperties(data || []);
      } catch (error) {
        console.error('Failed to fetch liked/disliked properties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [user]);

  // Split properties into liked/disliked
  const likedProperties = properties.filter((p: any) => p.status === 'liked');
  const dislikedProperties = properties.filter((p: any) => p.status === 'disliked');

  console.log(likedProperties)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

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
            onClick={() => setActiveTab('likes')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'likes'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ❤️ Liked ({likedProperties.length})
          </button>
          <button
            onClick={() => setActiveTab('dislikes')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'dislikes'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ❌ Disliked ({dislikedProperties.length})
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'likes' ? (
            likedProperties.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💔</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Liked Properties Yet</h3>
                <p className="text-gray-600">Start swiping to find properties you love!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {likedProperties.map((p: any) => (
                  <div key={p.property.id} className="bg-white p-6 rounded-lg shadow-sm">
                    {/* If media exists, show first image */}
                    {p.property.media?.[0]?.image_urls && (
                      <img
                        src={p.property.media[0].image_urls}
                        alt={`MLS #${p.property.mls_number}`}
                        className="w-full h-48 object-cover rounded-md mb-4"
                      />
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">MLS #{p.property.mls_number}</h3>
                      <span className="text-green-600 text-sm">❤️ Liked</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Liked on {new Date(p.property.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-gray-800 mt-2">{p.property.address}</p>
                    <p className="text-gray-600">
                      ${p.property.price?.toLocaleString()} • {p.property.bedrooms} bd • {p.property.bathrooms} ba
                    </p>
                  </div>
                ))}
              </div>
            )
          ) : (
            dislikedProperties.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👍</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Disliked Properties</h3>
                <p className="text-gray-600">You haven't disliked any properties yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dislikedProperties.map((p: any) => (
                  <div key={p.property.id} className="bg-white p-6 rounded-lg shadow-sm">
                    {p.property.media?.[0]?.image_urls && (
                      <img
                        src={p.property.media[0].image_urls}
                        alt={`MLS #${p.property.mls_number}`}
                        className="w-full h-48 object-cover rounded-md mb-4"
                      />
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">MLS #{p.property.mls_number}</h3>
                      <span className="text-red-600 text-sm">❌ Disliked</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Disliked on {new Date(p.property.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-gray-800 mt-2">{p.property.address}</p>
                    <p className="text-gray-600">
                      ${p.property.price?.toLocaleString()} • {p.property.bedrooms} bd • {p.property.bathrooms} ba
                    </p>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
