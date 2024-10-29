const width = 800;
const height = 500;

// Define color scale
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

// Create SVG container
const svg = d3
  .select("#map")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// Tooltip div
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

// Define map projection
const projection = d3
  .geoMercator()
  .scale(130)
  .translate([width / 2, height / 1.5]);

const path = d3.geoPath().projection(projection);

// Load and process data
Promise.all([
  d3.json("https://unpkg.com/world-atlas@2/countries-50m.json"), // World map data
  d3.csv("data.csv"), // Asylum application data
]).then(([worldData, asylumData]) => {
  // Convert TopoJSON to GeoJSON
  const countries = topojson.feature(
    worldData,
    worldData.objects.countries
  ).features;

  // Prepare data for tooltips
  const asylumApplications = {};
  asylumData.forEach((d) => {
    const country = d["Country of origin"];
    const asylumCountry = d["Country of asylum"];
    const applied = +d.applied;
    asylumApplications[country] = { asylumCountry, applied };
  });

  // Draw the map
  svg
    .selectAll("path")
    .data(countries)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", (d) => colorScale(Math.random() * 10))
    .attr("stroke", "#999")
    .attr("stroke-width", 0.5)
    .on("mouseover", function (event, d) {
      const countryName = d.properties.name;
      const asylumData = asylumApplications[countryName];
      const asylumCountry = asylumData ? asylumData.asylumCountry : "Unknown";
      const applied = asylumData ? asylumData.applied : "Unknown";

      tooltip.transition().duration(200).style("opacity", 1);
      tooltip
        .html(
          `<strong>${countryName}</strong><br>Country of Asylum: ${asylumCountry}<br>Applications: ${applied}`
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
      tooltip.transition().duration(200).style("opacity", 0);
    });
});
