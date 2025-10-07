import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { supabase } from "../lib/supabase";
import "leaflet/dist/leaflet.css";

// 🧭 Fix: Explicitly define marker icons (Leaflet default icons break in Vite)
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// ✅ Separate component for handling map clicks
const LocationPicker: React.FC<{ setLocation: (latlng: any) => void }> = ({ setLocation }) => {
  useMapEvents({
    click(e) {
      setLocation(e.latlng);
    },
  });
  return null;
};

interface LatLng {
  lat: number;
  lng: number;
}

export const ProfilePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [propertyType, setPropertyType] = useState("House");
  const [transactionType, setTransactionType] = useState("Sale");
  const [minBeds, setMinBeds] = useState<number | "">("");
  const [minBaths, setMinBaths] = useState<number | "">("");
  const [location, setLocation] = useState<LatLng>({ lat: 43.6532, lng: -79.3832 });
  const [radius, setRadius] = useState<number>(5000);

  // 🔄 Load existing preferences
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not logged in.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") setError(error.message);
      if (data) {
        setMinPrice(data.min_price ?? "");
        setMaxPrice(data.max_price ?? "");
        setPropertyType(data.property_type ?? "House");
        setTransactionType(data.transaction_type ?? "Sale");
        setMinBeds(data.min_beds ?? "");
        setMinBaths(data.min_baths ?? "");
        if (data.location_lat && data.location_lng)
          setLocation({ lat: data.location_lat, lng: data.location_lng });
        if (data.radius_m) setRadius(data.radius_m);
      }

      setLoading(false);
    };
    load();
  }, []);

  // 💾 Save preferences
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not logged in.");
      setSaving(false);
      return;
    }

    const updates = {
      user_id: user.id,
      min_price: minPrice || null,
      max_price: maxPrice || null,
      property_type: propertyType,
      transaction_type: transactionType,
      min_beds: minBeds || null,
      min_baths: minBaths || null,
      location_lat: location.lat,
      location_lng: location.lng,
      radius_m: radius,
      updated_at: new Date(),
    };

    const { error } = await supabase
      .from("user_preferences")
      .upsert(updates, { onConflict: "user_id" });

    if (error) setError(error.message);
    else setSuccess(true);

    setSaving(false);
  };

  const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
    label,
    children,
  }) => (
    <div className="mb-5">
      <label className="block text-gray-700 text-sm font-medium mb-2">
        {label}
      </label>
      {children}
    </div>
  );

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading preferences...</div>
      </div>
    );

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-secondary-50" />
      <div className="relative z-10 max-w-lg mx-auto px-6 py-12 bg-white/90 shadow-xl rounded-2xl border border-gray-200 mt-12">
        <h1 className="text-3xl font-extrabold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600">
          Your Property Preferences
        </h1>

        {error && <div className="text-red-600 text-center text-sm mb-3">{error}</div>}
        {success && <div className="text-green-600 text-center text-sm mb-3">Saved!</div>}

        {/* Price Range */}
        <Field label="Price Range (CAD)">
          <div className="flex space-x-4">
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : "")}
              className="w-1/2 border border-gray-300 rounded-lg p-2"
            />
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : "")}
              className="w-1/2 border border-gray-300 rounded-lg p-2"
            />
          </div>
        </Field>

        {/* Property Type */}
        <Field label="Property Type">
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2"
          >
            <option>House</option>
            <option>Condo</option>
            <option>Townhouse</option>
            <option>Apartment</option>
            <option>Duplex</option>
          </select>
        </Field>

        {/* Transaction Type */}
        <Field label="Transaction Type">
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2"
          >
            <option>Sale</option>
            <option>Lease</option>
          </select>
        </Field>

        {/* Beds & Baths */}
        <Field label="Minimum Bedrooms">
          <input
            type="number"
            value={minBeds}
            onChange={(e) => setMinBeds(e.target.value ? Number(e.target.value) : "")}
            className="w-full border border-gray-300 rounded-lg p-2"
          />
        </Field>

        <Field label="Minimum Bathrooms">
          <input
            type="number"
            value={minBaths}
            onChange={(e) => setMinBaths(e.target.value ? Number(e.target.value) : "")}
            className="w-full border border-gray-300 rounded-lg p-2"
          />
        </Field>

        {/* Map Section */}
        <Field label="Preferred Area">
          <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-300">
            <MapContainer
              center={location}
              zoom={12}
              scrollWheelZoom
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://osm.org">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker
                position={location}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const pos = e.target.getLatLng();
                    setLocation(pos);
                  },
                }}
                icon={markerIcon}
              />
              <Circle
                center={location}
                radius={radius}
                pathOptions={{ color: "#3b82f6", opacity: 0.3 }}
              />
              <LocationPicker setLocation={setLocation} />
            </MapContainer>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <label className="text-sm text-gray-600">
              Radius: {(radius / 1000).toFixed(1)} km
            </label>
            <input
              type="range"
              min={1000}
              max={50000}
              step={1000}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-2/3 accent-primary-600"
            />
          </div>
        </Field>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 mt-4 rounded-lg text-white font-semibold bg-gradient-to-r from-primary-600 to-secondary-600 hover:opacity-90 transition"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
};
