const width = 800;
const height = 500;
const colorScale = d3
  .scaleThreshold()
  .domain([1000, 5000, 10000, 50000, 100000, 500000, 1000000])
  .range(d3.schemeReds[8]);
let start = false;
let intervalId;
let currentIndex = 0;

const svg = d3
  .select("#map")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

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

Promise.all([
  d3.json("https://unpkg.com/world-atlas@2/countries-50m.json"),
  d3.csv("refugee.csv"),
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
        .html(`<strong>${countryName}</strong><br>Refugees: ${refugees}`)
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
  const legendWidth = 600;
  const legendHeight = 20;

  const legend = d3
    .select("#legend")
    .append("svg")
    .attr("width", legendWidth + 80)
    .attr("height", legendHeight + 60)
    .attr("transform", `translate(${(width - legendWidth) / 2}, 0)`);

  const ranges = [0, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];
  const legendData = ranges.slice(1).map((d, i) => ({
    color: colorScale(d),
    range: `${ranges[i]}`,
    min: ranges[i],
    max: d,
  }));

  const legendItemWidth = legendWidth / legendData.length;

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
    .on("mouseover", function (event, d) {
      d3.select(this).attr("stroke", "#000").attr("stroke-width", 2);
      svg.selectAll("path").style("opacity", (countryData) => {
        const countryName = countryData.properties.name;
        const asylumData =
          asylumApplications[countryNameMapping[countryName] || countryName];
        if (
          asylumData &&
          asylumData.refugees >= d.min &&
          asylumData.refugees <= d.max
        ) {
          return 1;
        }
        return 0.2;
      });
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke", "none").attr("stroke-width", 0);
      svg.selectAll("path").style("opacity", 1);
    });

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
    .text((d) => d.range);

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
  d3.select("#currentYear").text(year);
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
  }, 1500);
}

function initializeSlider() {
  const slider = d3
    .select("#dateSlider")
    .attr("min", 0)
    .attr("max", years.length - 1)
    .attr("value", 0)
    .on("input", updateYearFromSlider);
  d3.select("#currentYear").text(years[0]);
}
