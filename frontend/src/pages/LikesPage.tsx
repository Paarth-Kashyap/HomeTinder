import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { getUserProperties, removeUserProperty } from "../lib/supabase";
import type { Listing } from "../types";

const PAGE_SIZE = 12; // 👈 tweak page size here

export const LikesPage: React.FC = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"likes" | "dislikes">("likes");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchProperties = async () => {
      if (!user) return;

      try {
        const data = await getUserProperties();
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
          status: item.status,             // "liked" | "disliked"
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

  // Derived lists (memoized)
  const likedProperties = useMemo(
    () => properties.filter((p: any) => p.status === "liked"),
    [properties]
  );
  const dislikedProperties = useMemo(
    () => properties.filter((p: any) => p.status === "disliked"),
    [properties]
  );

  // Reset to first page when switching tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Current list & pagination math
  const currentList = activeTab === "likes" ? likedProperties : dislikedProperties;
  const pageCount = Math.max(1, Math.ceil(currentList.length / PAGE_SIZE));
  const clampedPage = Math.min(currentPage, pageCount);
  const start = (clampedPage - 1) * PAGE_SIZE;
  const pageItems = currentList.slice(start, start + PAGE_SIZE);

  // Remove listing from user_properties and maintain pagination sanity
  const handleRemove = async (mls_number: string) => {
    setProperties((prev) => {
      const next = prev.filter((p: any) => p.mls_number !== mls_number);

      // Recompute pageCount for the tab we’re on after removal
      const nextLiked = next.filter((p: any) => p.status === "liked");
      const nextDisliked = next.filter((p: any) => p.status === "disliked");
      const nextLen = activeTab === "likes" ? nextLiked.length : nextDisliked.length;
      const nextPageCount = Math.max(1, Math.ceil(nextLen / PAGE_SIZE));

      if (clampedPage > nextPageCount) {
        setCurrentPage(nextPageCount);
      }

      return next;
    });

    try {
      await removeUserProperty(mls_number);
      console.log(`Property ${mls_number} removed successfully`);
    } catch (err) {
      console.error("Failed to remove property:", err);
    }
  };

  const Loading = () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
    </div>
  );

  const renderCard = (p: any, isLiked: boolean) => {
    const parts = p.address.split(",");
    const street = parts[0] || "";
    const city = parts[1]?.trim() || "";
    const provinceAndPostal = parts[2]?.trim() || "";
    const [province, ...postalParts] = provinceAndPostal.split(" ");
    const postal = postalParts.join(" ");

    return (
      <div key={p.id} className="rounded-2xl border border-gray-200 bg-white/90 shadow-sm p-6">
        {p.images?.[0] && (
          <img
            src={p.images[0]}
            alt={`MLS #${p.mls_number}`}
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}

        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-lg">{street}</h3>
          <button
            onClick={() => handleRemove(p.mls_number)}
            className="text-sm text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>

        <p className="text-gray-700">
          {city}{city && province ? "," : ""} {province}
        </p>
        {postal && <p className="text-gray-600">{postal}</p>}

        <p className="text-sm text-gray-600 mt-1">
          MLS #{p.mls_number} • {isLiked ? "Liked" : "Disliked"} on{" "}
          {new Date(p.created_at).toLocaleDateString()}
        </p>

        <p className="text-gray-800 mt-2">
          ${p.price?.toLocaleString()} • {p.bedrooms} bd • {p.bathrooms} ba
        </p>
      </div>
    );
  };

  const EmptyState = ({ type }: { type: "likes" | "dislikes" }) => (
    <div className="text-center py-12 rounded-2xl border border-gray-200 bg-white/80 shadow-sm">
      <div className="text-6xl mb-4">{type === "likes" ? "💔" : "👍"}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {type === "likes" ? "No Liked Properties Yet" : "No Disliked Properties"}
      </h3>
      <p className="text-gray-600">
        {type === "likes"
          ? "Start swiping to find properties you love!"
          : "You haven't disliked any properties yet."}
      </p>
    </div>
  );

  const Pager = () => {
    if (pageCount <= 1) return null;

    // compact page numbers with ellipses
    const nums: (number | "…")[] = [];
    const push = (n: number | "…") => nums.push(n);

    const windowSize = 1; // show current-1 .. current+1
    const left = Math.max(1, clampedPage - windowSize);
    const right = Math.min(pageCount, clampedPage + windowSize);

    if (left > 1) push(1);
    if (left > 2) push("…");
    for (let n = left; n <= right; n++) push(n);
    if (right < pageCount - 1) push("…");
    if (right < pageCount) push(pageCount);

    return (
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={clampedPage === 1}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white/80 text-sm disabled:opacity-50"
        >
          ← Prev
        </button>

        <div className="flex items-center gap-1">
          {nums.map((n, i) =>
            n === "…" ? (
              <span key={`e-${i}`} className="px-2 text-gray-500">…</span>
            ) : (
              <button
                key={n}
                onClick={() => setCurrentPage(n)}
                aria-current={n === clampedPage ? "page" : undefined}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  n === clampedPage
                    ? "border-primary-200 bg-primary-50 text-primary-700"
                    : "border-gray-200 bg-white/80 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {n}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
          disabled={clampedPage === pageCount}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white/80 text-sm disabled:opacity-50"
        >
          Next →
        </button>
      </div>
    );
  };

  if (loading) return <Loading />;

  const hasAny = currentList.length > 0;

  return (
    <div className="min-h-screen relative z-10">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600 mb-2">
            Your Preferences
          </h1>
          <p className="text-gray-700">View your liked and disliked properties</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 rounded-xl border border-gray-200 bg-white/70 backdrop-blur p-1">
          <button
            onClick={() => setActiveTab("likes")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === "likes"
                ? "bg-white text-primary-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            ❤️ Liked ({likedProperties.length})
          </button>
          <button
            onClick={() => setActiveTab("dislikes")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === "dislikes"
                ? "bg-white text-primary-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            ❌ Disliked ({dislikedProperties.length})
          </button>
        </div>

        {/* Content */}
        {!hasAny ? (
          <EmptyState type={activeTab} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pageItems.map((p: any) => renderCard(p, activeTab === "likes"))}
            </div>

            {/* Footer + Pager */}
            <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing{" "}
                <strong>
                  {currentList.length === 0
                    ? 0
                    : `${start + 1}-${Math.min(start + PAGE_SIZE, currentList.length)}`}
                </strong>{" "}
                of <strong>{currentList.length}</strong> {activeTab}
              </span>
            </div>

            <Pager />
          </>
        )}
      </div>
    </div>
  );
};
