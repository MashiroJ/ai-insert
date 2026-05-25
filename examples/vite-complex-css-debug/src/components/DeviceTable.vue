<template>
  <section class="device-table-card" data-component="DeviceTable">
    <div class="panel-header compact">
      <div>
        <p class="section-kicker">Device registry</p>
        <h2>Recent telemetry</h2>
      </div>
      <button class="ghost-button">Export</button>
    </div>

    <div class="table-shell">
      <div class="table-row table-head">
        <span>Device</span>
        <span>Zone</span>
        <span>Status</span>
        <span>Last ping</span>
      </div>
      <div class="table-row">
        <span>Robot A12</span>
        <span>Warehouse</span>
        <span class="chip ok">Charging</span>
        <span>22 sec</span>
      </div>
      <div class="table-row">
        <span>Sensor B2</span>
        <span>East wing</span>
        <span class="chip warn">Drift</span>
        <span>1 min</span>
      </div>
      <div class="table-row">
        <span>Door C7</span>
        <span>Loading dock</span>
        <span class="chip neutral">Review</span>
        <span>4 min</span>
      </div>
    </div>
  </section>
</template>
