<script setup lang="ts">
defineProps<{
  title: string;
  body: string;
}>();
</script>

<template>
  <article class="feature-card">
    <h2>{{ title }}</h2>
    <p>{{ body }}</p>
  </article>
</template>
