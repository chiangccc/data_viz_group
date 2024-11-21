const width = 800;
const height = 500;
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

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
let selectedYear = "2014";

const filterDataByYear = (year) => {
  const asylumApplications = {};
  asylumData.forEach((d) => {
    if (d.Year === year) {
      const country = d["Country of origin"];
      const refugees = +d["Refugees under UNHCR's mandate"];
      asylumApplications[country] = { refugees };
    }
  });
  return asylumApplications;
};

const yearDropdown = d3.select("#year").append("select");
yearDropdown.on("change", function () {
  selectedYear = this.value;
  updateMap();
});

Promise.all([
  d3.json("https://unpkg.com/world-atlas@2/countries-50m.json"),
  d3.csv("refugees.csv"),
]).then(([worldData, csvData]) => {
  asylumData = csvData;
  countries = topojson.feature(worldData, worldData.objects.countries).features;

  const years = Array.from(new Set(asylumData.map((d) => d.Year)));
  yearDropdown
    .selectAll("option")
    .data(years)
    .enter()
    .append("option")
    .attr("value", (d) => d)
    .text((d) => d);

  updateMap();
});

function updateMap() {
  const asylumApplications = filterDataByYear(selectedYear);
  const unknownRefugeeCountries = []; // array to store countries with unknown data

  svg
    .selectAll("path")
    .data(countries)
    .join("path")
    .attr("d", path)
    .attr("fill", (d) => {
      const countryName = d.properties.name;
      const asylumData = asylumApplications[countryName];

      // Check if refugee data is unknown and add to the list
      if (!asylumData) {
        unknownRefugeeCountries.push(countryName);
      }

      return asylumData ? colorScale(asylumData.refugees) : "#ccc";
    })
    .attr("stroke", "#999")
    .attr("stroke-width", 0.5)
    .on("mouseover", function (event, d) {
      const countryName = d.properties.name;
      const asylumData = asylumApplications[countryName];
      const refugees = asylumData ? asylumData.refugees : "Unknown";

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
      tooltip.transition().duration(200).style("opacity", 0);
    });

  // Log the countries with unknown refugee data
  console.log("Countries with unknown refugee data:", unknownRefugeeCountries);
}
