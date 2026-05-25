<script setup lang="ts">
defineProps<{
  label: string;
  value: string;
  trend: string;
  tone: string;
}>();
</script>

<template>
  <article class="metric-tile" :data-tone="tone" data-component="MetricTile">
    <span class="metric-icon"></span>
    <div class="metric-copy">
      <small>{{ label }}</small>
      <strong>{{ value }}</strong>
    </div>
    <span class="metric-trend">{{ trend }}</span>
  </article>
</template>
