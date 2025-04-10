<template>
  <div>
    <input
      v-model="postcode"
      placeholder="Enter postcode"
      class="p-2 mb-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <button
      @click="updateMap"
      class="bg-blue-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 ease-in-out mb-4"
    >
      Update Map
    </button>
    <button
      @click="resetMap"
      class="bg-red-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-300 ease-in-out"
    >
      Reset Shapes
    </button>
    <div ref="mapElement" class="w-full h-96 mt-4"></div>
  </div>
  <br />
</template>
<br />
<script setup>
import { ref, onMounted } from "vue";

const map = ref(null);
const mapElement = ref(null);
const postcode = ref("");
const drawnShapes = ref([]);

const loadGoogleMaps = () => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js?key=AIzaSyBLE0x7t1tAmWX_1nrutnlYEThk8QFEmoc&libraries=places,drawing";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps API"));
    document.head.appendChild(script);
  });
};

const initMap = async () => {
  await loadGoogleMaps();

  if (!window.google || !window.google.maps) {
    console.error("Google Maps API failed to load.");
    return;
  }

  map.value = new google.maps.Map(mapElement.value, {
    center: { lat: 51.75202, lng: -1.257677 },
    zoom: 15,
  });

  const drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: google.maps.drawing.OverlayType.RECTANGLE,
    drawingControl: true,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_CENTER,
      drawingModes: [
        google.maps.drawing.OverlayType.MARKER,
        google.maps.drawing.OverlayType.CIRCLE,
        google.maps.drawing.OverlayType.POLYGON,
        google.maps.drawing.OverlayType.POLYLINE,
        google.maps.drawing.OverlayType.RECTANGLE,
      ],
    },
  });
  drawingManager.setMap(map.value);

  google.maps.event.addListener(drawingManager, "overlaycomplete", (event) => {
    drawnShapes.value.push(event.overlay);
  });
};

const updateMap = async () => {
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: postcode.value }, (results, status) => {
    if (status === "OK" && results[0]) {
      map.value.setCenter(results[0].geometry.location);
    } else {
      console.error(
        "Geocode was not successful for the following reason: " + status
      );
    }
  });
};

// Reset the map by clearing all drawn shapes
const resetMap = () => {
  // Remove each shape from the map
  drawnShapes.value.forEach((shape) => shape.setMap(null));
  drawnShapes.value = []; // Clear the shapes array
};

onMounted(() => {
  initMap();
});

const convertShapesToSpeckle = () => {
  return drawnShapes.value.map((shape) => {
    let speckleData = {};

    if (shape instanceof google.maps.Rectangle) {
      const bounds = shape.getBounds();
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      speckleData = {
        type: "rectangle",
        coordinates: [
          { lat: ne.lat(), lng: ne.lng() },
          { lat: sw.lat(), lng: sw.lng() },
        ],
      };
    } else if (shape instanceof google.maps.Circle) {
      speckleData = {
        type: "circle",
        center: {
          lat: shape.getCenter().lat(),
          lng: shape.getCenter().lng(),
        },
        radius: shape.getRadius(),
      };
    } else if (shape instanceof google.maps.Polygon) {
      speckleData = {
        type: "polygon",
        coordinates: shape
          .getPath()
          .getArray()
          .map((point) => ({
            lat: point.lat(),
            lng: point.lng(),
          })),
      };
    } else if (shape instanceof google.maps.Polyline) {
      speckleData = {
        type: "polyline",
        coordinates: shape
          .getPath()
          .getArray()
          .map((point) => ({
            lat: point.lat(),
            lng: point.lng(),
          })),
      };
    } else {
      console.warn("Unsupported shape type:", shape);
    }

    return speckleData;
  });
};

defineProps({
  customClass: {
    type: String,
    default: "",
  },
});
</script>
