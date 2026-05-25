<script setup lang="ts">
import ShellSidebar from './components/ShellSidebar.vue';
import MetricTile from './components/MetricTile.vue';
import LabCanvas from './components/LabCanvas.vue';
import DeviceTable from './components/DeviceTable.vue';

const metrics = [
  { label: 'Active devices', value: '1,248', trend: '+12%', tone: 'green' },
  { label: 'Alerts', value: '37', trend: '-8%', tone: 'coral' },
  { label: 'Latency', value: '42ms', trend: 'stable', tone: 'blue' },
  { label: 'Power draw', value: '68%', trend: '+3%', tone: 'amber' },
];
</script>

<template>
  <div class="app-shell">
    <ShellSidebar />

    <main class="workspace">
      <header class="topbar" data-component="Topbar">
        <div>
          <p class="section-kicker">Smart facility command</p>
          <h1>Operations Lab</h1>
        </div>
        <div class="operator-card">
          <span class="operator-avatar">ML</span>
          <div>
            <strong>Mila Lin</strong>
            <small>Lead operator</small>
          </div>
        </div>
      </header>

      <section class="overview-grid" data-component="OverviewGrid">
        <MetricTile
          v-for="item in metrics"
          :key="item.label"
          :label="item.label"
          :value="item.value"
          :trend="item.trend"
          :tone="item.tone"
        />
      </section>

      <section class="content-grid">
        <LabCanvas />

        <aside class="right-rail" data-component="RightRail">
          <div class="incident-card">
            <div class="incident-head">
              <span class="status-dot"></span>
              <strong>Incident queue</strong>
            </div>
            <button class="pill-button">Dispatch</button>
            <ul class="incident-list">
              <li>
                <span class="severity high">High</span>
                <div>
                  <strong>East wing humidity drift</strong>
                  <small>Sensor cluster B2 reported 18 min ago</small>
                </div>
              </li>
              <li>
                <span class="severity med">Med</span>
                <div>
                  <strong>Inventory robot paused</strong>
                  <small>Route blocked near cold storage</small>
                </div>
              </li>
              <li>
                <span class="severity low">Low</span>
                <div>
                  <strong>Door cycle anomaly</strong>
                  <small>Maintenance review requested</small>
                </div>
              </li>
            </ul>
          </div>

          <div class="handoff-card">
            <p class="section-kicker">Shift handoff</p>
            <h2>3 notes waiting</h2>
            <p>Drag small chips, cards, and labels here to feel whether CSS Debug stays local.</p>
          </div>
        </aside>
      </section>

      <DeviceTable />
    </main>
  </div>
</template>
