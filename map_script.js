const width = 800;
const height = 500;
const colorScale = d3
  .scaleSequential(d3.interpolatePlasma)
  .domain([0, 1000000]);

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
  "South Korea": "South Korea",
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
    .filter((year) => year >= 2014 && year <= 2024);

  createLegend();
  updateMap(2014);
  d3.select("#year").text("2014");
});

function updateMap(year) {
  const asylumApplications = {};

  asylumData.forEach((d) => {
    if (d.Year == year) {
      const country = d.Entity.trim();
      const refugees = +d["Refugees by country of origin"];
      if (!isNaN(refugees)) {
        asylumApplications[country] = { refugees };
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
      const mappedCountryName = countryNameMapping[countryName] || countryName;
      const asylumData = asylumApplications[mappedCountryName];

      return asylumData ? colorScale(asylumData.refugees) : "#ccc";
    })
    .attr("stroke", "#999")
    .attr("stroke-width", 0.5)
    .on("mouseover", function (event, d) {
      const countryName = d.properties.name;
      const mappedCountryName = countryNameMapping[countryName] || countryName;
      const asylumData = asylumApplications[mappedCountryName];
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
          const mappedCountryName =
            countryNameMapping[countryName] || countryName;
          const asylumData = asylumApplications[mappedCountryName];
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
  const legendHeight = 15;

  const legend = d3
    .select("#legend")
    .append("svg")
    .attr("width", legendWidth + 80)
    .attr("height", legendHeight + 60)
    .attr("transform", "translate(" + (width - legendWidth) / 2 + ", 0)");

  legend
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 40)
    .attr("height", legendHeight)
    .attr("fill", "#ccc");

  legend
    .append("text")
    .attr("x", 20)
    .attr("y", legendHeight + 15)
    .attr("text-anchor", "middle")
    .style("font-size", "10px")
    .text("No data");

  legend
    .append("rect")
    .attr("x", 60)
    .attr("y", 0)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#gradient)");

  const legendScale = d3
    .scaleLog()
    .domain([1000, 1000000])
    .range([0, legendWidth]);

  const legendAxis = d3
    .axisBottom(legendScale)
    .tickValues([1000, 5000, 10000, 50000, 100000, 500000, 1000000])
    .tickFormat((d) =>
      d >= 1000000 ? `${d / 1000000}M` : d >= 1000 ? `${d / 1000}K` : d
    );

  const gradient = legend
    .append("defs")
    .append("linearGradient")
    .attr("id", "gradient")
    .attr("x1", "0%")
    .attr("x2", "100%");

  for (let i = 0; i <= 100; i++) {
    gradient
      .append("stop")
      .attr("offset", `${i}%`)
      .attr("stop-color", colorScale(1000 + (i / 100) * 999000));
  }

  legend
    .append("g")
    .attr("transform", `translate(60, ${legendHeight + 10})`)
    .call(legendAxis);

  legend
    .append("text")
    .attr("x", legendWidth / 2 + 60)
    .attr("y", legendHeight + 50)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Number of Refugees");
}

const year_btn = d3.select("#timelapse");
year_btn.on("click", function () {
  playTimeLapse();
});

function playTimeLapse() {
  let currentIndex = 0;

  const interval = setInterval(() => {
    const year = years[currentIndex];
    updateMap(year);

    d3.select("#year").text(year);

    if (currentIndex >= years.length - 1) {
      clearInterval(interval);
    } else {
      currentIndex++;
    }
  }, 1000);
}
