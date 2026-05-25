<template>
  <section class="lab-panel" data-component="LabCanvas">
    <div class="panel-header">
      <div>
        <p class="section-kicker">Live layout</p>
        <h2>Facility map</h2>
      </div>
      <button class="ghost-button">Calibrate</button>
    </div>

    <div class="lab-stage" data-component="LabStage">
      <svg class="map-art" viewBox="0 0 760 430" role="img" aria-label="Stylized facility map">
        <defs>
          <linearGradient id="floor" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#f7f3e8" />
            <stop offset="1" stop-color="#dfe9f7" />
          </linearGradient>
        </defs>
        <rect x="18" y="22" width="724" height="386" rx="28" fill="url(#floor)" />
        <path d="M76 96h220v116H76z" fill="#ffffff" stroke="#9fb3c8" />
        <path d="M328 96h190v116H328z" fill="#ffffff" stroke="#9fb3c8" />
        <path d="M552 96h118v246H552z" fill="#ffffff" stroke="#9fb3c8" />
        <path d="M76 244h442v98H76z" fill="#ffffff" stroke="#9fb3c8" />
        <circle cx="186" cy="154" r="28" fill="#68b684" />
        <circle cx="424" cy="154" r="24" fill="#4d7cc7" />
        <circle cx="612" cy="236" r="22" fill="#e46f5f" />
        <path d="M118 292h354" stroke="#d8a03b" stroke-width="16" stroke-linecap="round" />
      </svg>

      <div class="floating-device device-a">
        <span class="device-light"></span>
        <strong>Robot A12</strong>
        <small>charging bay</small>
      </div>

      <div class="floating-device device-b">
        <span class="device-light warning"></span>
        <strong>Sensor B2</strong>
        <small>humidity drift</small>
      </div>

      <div class="floating-toolbar">
        <button>Zones</button>
        <button class="active">Routes</button>
        <button>Heat</button>
      </div>
    </div>
  </section>
</template>
