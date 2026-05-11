"use client";

import { useEffect, useRef } from "react";
import type { Distributor } from "@/data/distributors";

interface Props {
  distributors: Distributor[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function DistributorMap({ distributors, selected, onSelect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markersRef = useRef<Map<string, unknown>>(new Map());

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    import("leaflet").then((L) => {
      if (mapInstanceRef.current) return;

      // Fix default icon path for Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, { zoomControl: true }).setView([-38, -63.5], 4.2);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      const orangeIcon = L.divIcon({
        html: `<div style="background:#DF8635;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        className: "",
      });

      distributors.forEach((d) => {
        const marker = L.marker([d.lat, d.lng], { icon: orangeIcon })
          .addTo(map)
          .bindPopup(
            `<strong>${d.name}</strong><br/>${d.city}, ${d.province}${d.phone ? `<br/>${d.phone}` : ""}`
          );
        marker.on("click", () => onSelect(d.id));
        markersRef.current.set(d.id, marker);
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected || !mapInstanceRef.current) return;
    const marker = markersRef.current.get(selected);
    if (marker) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (marker as any).openPopup();
    }
  }, [selected]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div ref={mapRef} className="w-full h-full z-0" />
    </>
  );
}
