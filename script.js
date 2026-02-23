const metricConfig = {
  gdp: { label: "PIB", color: "#3a63ff", suffix: " mil M€" },
  unemployment: { label: "Desempleo", color: "#ff6b3d", suffix: "%" },
  inflation: { label: "Inflación", color: "#00a57a", suffix: "%" }
};

const state = {
  data: [],
  filteredData: [],
  metricA: "gdp",
  metricB: "unemployment"
};

const tableBody = document.getElementById("dataTableBody");
const statsCards = document.getElementById("statsCards");
const chartArea = document.getElementById("chartArea");
const yearSearch = document.getElementById("yearSearch");
const inflationFilter = document.getElementById("inflationFilter");
const sortBy = document.getElementById("sortBy");
const sortDir = document.getElementById("sortDir");
const metricASelect = document.getElementById("metricA");
const metricBSelect = document.getElementById("metricB");

function format(value, metric) {
  return `${value.toLocaleString("es-ES", { maximumFractionDigits: 1 })}${metricConfig[metric].suffix}`;
}

async function loadData() {
  const response = await fetch("./data/economia-espana-2005-2025.json");
  if (!response.ok) throw new Error("No se pudieron cargar los datos JSON.");
  state.data = await response.json();
  state.filteredData = [...state.data];
}

function renderMetricSelectors() {
  const options = Object.entries(metricConfig)
    .map(([key, cfg]) => `<option value="${key}">${cfg.label}</option>`)
    .join("");

  metricASelect.innerHTML = options;
  metricBSelect.innerHTML = options;
  metricASelect.value = state.metricA;
  metricBSelect.value = state.metricB;
}

function filterAndSortData() {
  const yearTerm = yearSearch.value.trim();
  const inflationType = inflationFilter.value;
  const sortKey = sortBy.value;
  const direction = sortDir.value === "asc" ? 1 : -1;

  state.filteredData = state.data
    .filter((row) => (yearTerm ? String(row.year).includes(yearTerm) : true))
    .filter((row) => {
      if (inflationType === "positive") return row.inflation > 0;
      if (inflationType === "negative") return row.inflation < 0;
      return true;
    })
    .sort((a, b) => (a[sortKey] - b[sortKey]) * direction);
}

function renderTable() {
  tableBody.innerHTML = state.filteredData
    .map(
      (row) => `
      <tr>
        <td>${row.year}</td>
        <td>${row.gdp.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
        <td>${row.unemployment.toFixed(1)}</td>
        <td>${row.inflation.toFixed(1)}</td>
      </tr>`
    )
    .join("");
}

function changeText(first, last) {
  const diff = last - first;
  const symbol = diff >= 0 ? "↑" : "↓";
  const sign = diff >= 0 ? "+" : "";
  return `${symbol} ${sign}${diff.toFixed(1)} p.p. (2005-2025)`;
}

function renderStats() {
  const first = state.data[0];
  const last = state.data[state.data.length - 1];

  const cards = [
    {
      title: `PIB ${last.year}`,
      value: format(last.gdp, "gdp"),
      trend: `${last.gdp - first.gdp >= 0 ? "↑" : "↓"} ${(((last.gdp - first.gdp) / first.gdp) * 100).toFixed(1)}% desde 2005`
    },
    {
      title: `Desempleo ${last.year}`,
      value: format(last.unemployment, "unemployment"),
      trend: changeText(first.unemployment, last.unemployment)
    },
    {
      title: `Inflación ${last.year}`,
      value: format(last.inflation, "inflation"),
      trend: changeText(first.inflation, last.inflation)
    }
  ];

  statsCards.innerHTML = cards
    .map(
      (card) => `
      <article class="stat-card">
        <h3>${card.title}</h3>
        <div class="value">${card.value}</div>
        <div class="trend">${card.trend}</div>
      </article>`
    )
    .join("");
}

function drawComparisonChart(metricA, metricB) {
  const width = chartArea.clientWidth || 900;
  const height = 360;
  const margin = { top: 30, right: 60, bottom: 44, left: 60 };

  const valuesA = state.data.map((d) => d[metricA]);
  const valuesB = state.data.map((d) => d[metricB]);
  const years = state.data.map((d) => d.year);

  const minA = Math.min(...valuesA);
  const maxA = Math.max(...valuesA);
  const minB = Math.min(...valuesB);
  const maxB = Math.max(...valuesB);

  const rangeA = maxA - minA || 1;
  const rangeB = maxB - minB || 1;

  const xScale = (idx) => margin.left + (idx / (years.length - 1)) * (width - margin.left - margin.right);
  const yScaleA = (value) => margin.top + ((maxA - value) / rangeA) * (height - margin.top - margin.bottom);
  const yScaleB = (value) => margin.top + ((maxB - value) / rangeB) * (height - margin.top - margin.bottom);

  const pointsA = valuesA.map((v, i) => ({ x: xScale(i), y: yScaleA(v), year: years[i], value: v }));
  const pointsB = valuesB.map((v, i) => ({ x: xScale(i), y: yScaleB(v), year: years[i], value: v }));

  const pathA = pointsA.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const pathB = pointsB.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  const ticksA = Array.from({ length: 5 }, (_, i) => minA + ((maxA - minA) * i) / 4).reverse();
  const ticksB = Array.from({ length: 5 }, (_, i) => minB + ((maxB - minB) * i) / 4).reverse();

  chartArea.innerHTML = `
    <div class="legend">
      <div class="legend-item"><span class="swatch" style="background:${metricConfig[metricA].color}"></span>${metricConfig[metricA].label}</div>
      <div class="legend-item"><span class="swatch" style="background:${metricConfig[metricB].color}"></span>${metricConfig[metricB].label}</div>
    </div>
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="Comparador de ${metricConfig[metricA].label} y ${metricConfig[metricB].label}">
      ${ticksA
        .map((tick) => {
          const y = yScaleA(tick);
          return `
            <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#e6eaf2" />
            <text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" fill="${metricConfig[metricA].color}" font-size="11">${tick.toFixed(1)}</text>
          `;
        })
        .join("")}

      ${ticksB
        .map((tick) => {
          const y = yScaleB(tick);
          return `<text x="${width - margin.right + 8}" y="${y + 4}" fill="${metricConfig[metricB].color}" font-size="11">${tick.toFixed(1)}</text>`;
        })
        .join("")}

      <path d="${pathA}" fill="none" stroke="${metricConfig[metricA].color}" stroke-width="3" />
      <path d="${pathB}" fill="none" stroke="${metricConfig[metricB].color}" stroke-width="3" stroke-dasharray="7 5" />

      ${pointsA
        .map(
          (p) => `<circle class="data-point" cx="${p.x}" cy="${p.y}" r="4" fill="${metricConfig[metricA].color}" data-year="${p.year}" data-value="${p.value}" data-metric="${metricA}" />`
        )
        .join("")}

      ${pointsB
        .map(
          (p) => `<circle class="data-point" cx="${p.x}" cy="${p.y}" r="4" fill="${metricConfig[metricB].color}" data-year="${p.year}" data-value="${p.value}" data-metric="${metricB}" />`
        )
        .join("")}

      ${years
        .map((year, i) => {
          if (i % 3 !== 0 && i !== years.length - 1) return "";
          return `<text x="${xScale(i)}" y="${height - 14}" text-anchor="middle" fill="#5a6477" font-size="11">${year}</text>`;
        })
        .join("")}
    </svg>
  `;

  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.style.display = "none";
  chartArea.appendChild(tooltip);

  chartArea.querySelectorAll(".data-point").forEach((point) => {
    const show = (event) => {
      const year = point.getAttribute("data-year");
      const value = Number(point.getAttribute("data-value"));
      const metric = point.getAttribute("data-metric");
      tooltip.textContent = `${year} · ${metricConfig[metric].label}: ${format(value, metric)}`;
      tooltip.style.left = `${event.offsetX}px`;
      tooltip.style.top = `${event.offsetY}px`;
      tooltip.style.display = "block";
    };

    point.addEventListener("mousemove", show);
    point.addEventListener("touchstart", (event) => {
      const touch = event.touches[0];
      const rect = chartArea.getBoundingClientRect();
      show({ offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top });
    });
    point.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });
  });
}

function setupNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const links = document.querySelector(".nav-links");
  toggle.addEventListener("click", () => links.classList.toggle("open"));
  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => links.classList.remove("open"));
  });
}

function setupContactForm() {
  const form = document.getElementById("contactForm");
  const feedback = document.getElementById("formFeedback");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    feedback.textContent = `Gracias, ${data.get("name")}. Hemos recibido tu mensaje.`;
    form.reset();
  });
}

function setupFiltersAndSort() {
  [yearSearch, inflationFilter, sortBy, sortDir].forEach((control) => {
    control.addEventListener("input", () => {
      filterAndSortData();
      renderTable();
    });
    control.addEventListener("change", () => {
      filterAndSortData();
      renderTable();
    });
  });
}

function setupComparator() {
  const ensureDifferentMetrics = (changed) => {
    if (metricASelect.value === metricBSelect.value) {
      if (changed === "A") {
        metricBSelect.value = metricASelect.value === "gdp" ? "unemployment" : "gdp";
      } else {
        metricASelect.value = metricBSelect.value === "gdp" ? "unemployment" : "gdp";
      }
    }
    state.metricA = metricASelect.value;
    state.metricB = metricBSelect.value;
    drawComparisonChart(state.metricA, state.metricB);
  };

  metricASelect.addEventListener("change", () => ensureDifferentMetrics("A"));
  metricBSelect.addEventListener("change", () => ensureDifferentMetrics("B"));
}

async function init() {
  try {
    await loadData();
    renderMetricSelectors();
    renderStats();
    filterAndSortData();
    renderTable();
    drawComparisonChart(state.metricA, state.metricB);
    setupNavigation();
    setupContactForm();
    setupFiltersAndSort();
    setupComparator();

    window.addEventListener("resize", () => {
      drawComparisonChart(state.metricA, state.metricB);
    });
  } catch (error) {
    chartArea.innerHTML = `<p>No se pudieron cargar los datos económicos. ${error.message}</p>`;
    tableBody.innerHTML = "<tr><td colspan='4'>Error al cargar datos.</td></tr>";
  }
}

init();
