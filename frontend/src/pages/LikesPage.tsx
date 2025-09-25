import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getUserPreferences } from '../lib/supabase';
import type { UserPreference } from '../types';

export const LikesPage: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'likes' | 'dislikes'>('likes');

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;
      
      try {
        const data = await getUserPreferences();
        setPreferences(data);
      } catch (error) {
        console.error('Failed to fetch preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user]);

  const likedProperties = preferences.filter(p => p.action === 'like');
  const dislikedProperties = preferences.filter(p => p.action === 'dislike');

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
            <div>
              {likedProperties.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💔</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Liked Properties Yet</h3>
                  <p className="text-gray-600">Start swiping to find properties you love!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {likedProperties.map((preference) => (
                    <div key={preference.id} className="card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">MLS #{preference.mls_number}</h3>
                        <span className="text-green-600 text-sm">❤️ Liked</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Liked on {new Date(preference.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {dislikedProperties.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👍</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Disliked Properties</h3>
                  <p className="text-gray-600">You haven't disliked any properties yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dislikedProperties.map((preference) => (
                    <div key={preference.id} className="card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">MLS #{preference.mls_number}</h3>
                        <span className="text-red-600 text-sm">❌ Disliked</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Disliked on {new Date(preference.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
