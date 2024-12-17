const svg = d3.select("#map-svg");
const width = +svg.attr("width");
const height = +svg.attr("height");
const colorScale = d3
  .scaleThreshold()
  .domain([1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000])
  .range(d3.schemeReds[9]);
let start = false;
let intervalId;
let currentIndex = 0;

const formatNumber = d3.format(",");

svg.attr("width", width).attr("height", height);

const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("background-color", "#fff")
  .style("padding", "5px")
  .style("border", "1px solid #ccc")
  .style("border-radius", "3px")
  .style("pointer-events", "none")
  .style("opacity", 0);

const projection = d3
  .geoMercator()
  .scale(130)
  .translate([width / 2, height / 1.5]);
const path = d3.geoPath().projection(projection);

let asylumData;
let countries;
let years;
let selectedYear = "2013";

const countryNameMapping = {
  "United States of America": "United States",
  "South Korea": "Korea, Republic of",
  "Dem. Rep. Congo": "Congo",
  "Central African Rep.": "Central African Republic",
  "S. Sudan": "South Sudan",
  Somaliland: "Somalia",
  "Côte d'Ivoire": "Cote d'Ivoire",
  "Bosnia and Herz.": "Bosnia and Herzegovina",
  Macedonia: "North Macedonia",
  "Timor-Leste": "East Timor",
  "Dominican Rep.": "Dominican Republic",
  "Solomon Is.": "Solomon Islands",
};
const yearBox = d3.select("#year").append("select");
yearBox.on("change", function () {
  selectedYear = this.value;
  updateMap();
});
Promise.all([
  d3.json("https://unpkg.com/world-atlas@2/countries-50m.json"),
  d3.csv("./data/map_data.csv"),
]).then(([worldData, csvData]) => {
  asylumData = csvData;
  countries = topojson.feature(worldData, worldData.objects.countries).features;

  years = Array.from(new Set(asylumData.map((d) => d.Year)))
    .sort()
    .filter((year) => year >= 2013 && year <= 2023);

  createLegend();
  updateMap(2013);
  d3.select("#year").text("2013");
  initializeSlider();
});
let asylumApplications = {};

function updateMap(year) {
  asylumApplications = {};

  asylumData.forEach((d) => {
    if (d.Year == year) {
      const country = d.Entity.trim();
      const refugees = +d["Refugees by country of origin"];
      if (!isNaN(refugees)) {
        asylumApplications[countryNameMapping[country] || country] = {
          refugees,
        };
      }
    }
  });

  svg
    .selectAll("path")
    .data(countries)
    .join("path")
    .attr("d", path)
    .attr("fill", (d) => {
      const countryName = d.properties.name;
      const asylumData =
        asylumApplications[countryNameMapping[countryName] || countryName];
      return asylumData ? colorScale(asylumData.refugees) : "#ccc";
    })
    .attr("stroke", "#A9A9A9")
    .attr("stroke-width", 0.8)
    .on("mouseover", function (event, d) {
      const countryName = d.properties.name;
      const asylumData =
        asylumApplications[countryNameMapping[countryName] || countryName];
      const refugees = asylumData ? asylumData.refugees : "Unknown";

      d3.select(this)
        .transition()
        .duration(200)
        .style("opacity", 0.7)
        .attr("stroke", "#000")
        .attr("stroke-width", 2);

      tooltip.transition().duration(200).style("opacity", 1);
      tooltip
        .html(
          `<strong>${countryName}</strong><br>Refugees: ${formatNumber(
            refugees
          )}`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 20 + "px");
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", function () {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("fill", (d) => {
          const countryName = d.properties.name;
          const asylumData =
            asylumApplications[countryNameMapping[countryName] || countryName];
          return asylumData ? colorScale(asylumData.refugees) : "#ccc";
        })
        .attr("stroke", "#999")
        .style("opacity", 1)
        .attr("stroke-width", 0.5);

      tooltip.transition().duration(200).style("opacity", 0);
    });
}

function createLegend() {
  const legend = d3.select("#legend-svg");
  const legendWidth = +legend.attr("width");
  const legendHeight = +legend.attr("height");

  legend.attr("width", legendWidth + 80).attr("height", legendHeight + 60);

  const ranges = [
    0, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000,
  ];
  const legendData = ranges.slice(1).map((d, i) => ({
    color: colorScale(d),
    range: `${ranges[i]}`,
    min: ranges[i],
    max: d,
  }));

  const legendItemWidth = legendWidth / legendData.length;
  let selectedRanges = new Set();

  legend
    .selectAll("rect")
    .data(legendData)
    .join("rect")
    .attr("x", (d, i) => i * legendItemWidth + 60)
    .attr("y", 0)
    .attr("width", legendItemWidth)
    .attr("height", legendHeight)
    .style("fill", (d) => d.color)
    .style("cursor", "pointer")
    .attr("stroke", "none")
    .each(function (d) {
      d.selected = false;
    })
    .on("mouseover", function (event, d) {
      if (!d.selected) {
        d3.select(this).attr("stroke", "#000").attr("stroke-width", 2);
      }
    })
    .on("mouseout", function (event, d) {
      if (!d.selected) {
        d3.select(this).attr("stroke", "none").attr("stroke-width", 0);
      }
    })
    .on("click", function (event, d) {
      d.selected = !d.selected;
      if (d.selected) {
        selectedRanges.add(`${d.min}-${d.max}`);
        d3.select(this).attr("stroke", "#000").attr("stroke-width", 2);
      } else {
        selectedRanges.delete(`${d.min}-${d.max}`);
        d3.select(this).attr("stroke", "none").attr("stroke-width", 0);
      }

      updateCountryOpacity();
    });

  function updateCountryOpacity() {
    const ranges = Array.from(selectedRanges).map((range) => {
      const [min, max] = range.split("-").map(Number);
      return { min, max };
    });

    svg.selectAll("path").style("opacity", (countryData) => {
      const countryName = countryData.properties.name;
      const asylumData =
        asylumApplications[countryNameMapping[countryName] || countryName];

      if (!asylumData) {
        return 0.2;
      }

      const isInRange = ranges.some(
        (range) =>
          asylumData.refugees >= range.min && asylumData.refugees <= range.max
      );

      return isInRange ? 1 : 0.2;
    });
  }

  legend
    .selectAll("line")
    .data(ranges)
    .join("line")
    .attr("x1", (d, i) => i * legendItemWidth + 60)
    .attr("x2", (d, i) => i * legendItemWidth + 60)
    .attr("y1", 0)
    .attr("y2", legendHeight + 5)
    .attr("stroke", "#000")
    .attr("stroke-width", 1);

  legend
    .selectAll("text")
    .data(legendData)
    .join("text")
    .attr("x", (d, i) => i * legendItemWidth + 60)
    .attr("y", legendHeight + 15)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text((d) => `${formatNumber(d.range)}+`);

  legend
    .append("text")
    .attr("x", legendWidth / 2 + 60)
    .attr("y", legendHeight + 40)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Number of Refugees");
}

const year_btn = d3.select("#timelapse");
year_btn.on("click", function () {
  playTimeLapse();
});

function startDate() {
  const buttonImage = document.getElementById("buttonImage");
  if (start) {
    buttonImage.src = "./img/play-button.png";
    clearInterval(intervalId);
  } else {
    buttonImage.src = "./img/stop-button.png";
    playTimeLapse();
  }
  start = !start;
}

function updateYearFromSlider() {
  const slider = document.getElementById("dateSlider");
  currentIndex = slider.value;
  const year = years[currentIndex];
  updateMap(year);
  d3.select("#year").text(year);
}

function playTimeLapse() {
  intervalId = setInterval(() => {
    if (currentIndex >= years.length) {
      currentIndex = 0;
    }
    const year = years[currentIndex];
    updateMap(year);
    d3.select("#year").text(year);
    document.getElementById("dateSlider").value = currentIndex;
    currentIndex++;
  }, 1000);
}

function initializeSlider() {
  const slider = d3
    .select("#dateSlider")
    .attr("min", 0)
    .attr("max", years.length - 1)
    .attr("value", 0)
    .on("input", updateYearFromSlider);
}

d3.csv("/data/map_data.csv").then(function (data) {
  data.forEach((d) => {
    d["Refugees by country of origin"] = +d["Refugees by country of origin"];
  });
  const maxdata = d3.max(data, (d) => d["Refugees by country of origin"]);
  const maxDataRow = data.find(
    (d) => d["Refugees by country of origin"] === maxdata
  );
});
