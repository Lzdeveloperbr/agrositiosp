// Estilo escuro (preto & dourado) para os mapas do AgroSítio.
export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#17150f" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#c9b184" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d0c09" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#3a3223" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#9c8a67" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#152016" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#1a1811" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2519" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#191509" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4a3d1f" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#6b5527" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#b39c72" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#241f14" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b1620" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4d6c85" }] },
];
