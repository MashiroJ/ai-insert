<script setup lang="ts">
import FeatureCard from './FeatureCard.vue';
</script>

<template>
  <main class="page">
    <section class="hero">
      <p class="eyebrow">AI Inspect demo</p>
      <h1>Click any visible module after pressing Alt+Shift+I.</h1>
      <button class="primary-button">Example action</button>
    </section>

    <section class="grid">
      <FeatureCard title="Fast context" body="Selection data is sent to the local daemon." />
      <FeatureCard title="Vue source" body="The plugin reads Vue component metadata in dev mode." />
    </section>
  </main>
</template>
