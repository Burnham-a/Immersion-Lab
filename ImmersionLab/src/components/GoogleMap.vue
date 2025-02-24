<template>
  <div ref="mapContainer" class="w-full h-full"></div>
</template>

<script setup>
import { ref, onMounted, watchEffect } from "vue";

const mapContainer = ref(null);
const map = ref(null);
const position = ref({ lat: 51.75202, lng: -1.257677 });

onMounted(() => {
  if (mapContainer.value) {
    map.value = new google.maps.Map(mapContainer.value, {
      center: position.value,
      zoom: 12,
    });
  }
});

watchEffect(() => {
  // Optional: Update the map center if needed based on your viewer's context
  if (map.value) {
    map.value.setCenter(position.value);
  }
});

const setMapPosition = (lat, lng) => {
  position.value = { lat, lng };
  if (map.value) {
    map.value.setCenter(position.value);
  }
};
</script>

<style scoped>
.w-full {
  width: 100%;
}
.h-full {
  height: 100%;
}
</style>
