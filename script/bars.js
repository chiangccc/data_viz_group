const svg = d3.select("#bars-plot");

const width = +svg.attr("width");
const height = +svg.attr("height");

const margin = { top: 20, right: 20, bottom: 50, left: 80 };
const chartWidth = width - margin.left - margin.right;
const chartHeight = height - margin.top - margin.bottom;

const g = svg
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

d3.csv("./data/bar_chart/all_countries.csv").then(function (data) {
  const yearlyData = d3.rollup(
    data,
    (v) => ({
      refugees: d3.sum(v, (d) => +d["Refugees under UNHCR's mandate"] || 0),
    }),
    (d) => d.Year
  );

  const processedData = Array.from(yearlyData, ([year, values]) => ({
    year: +year,
    refugees: values.refugees,
  })).sort((a, b) => a.year - b.year);

  const x0 = d3
    .scaleBand()
    .domain(processedData.map((d) => d.year))
    .range([0, chartWidth])
    .padding(0.2);

  const x1 = d3
    .scaleBand()
    .domain("refugees")
    .range([0, x0.bandwidth()])
    .padding(0.1);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(processedData, (d) => Math.max(d.refugees))])
    .nice()
    .range([chartHeight, 0]);

  const color = d3.scaleOrdinal().domain("refugees").range(["#F8AE54"]);

  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(x0).tickFormat(d3.format("d")));

  g.append("g").attr("class", "y-axis").call(d3.axisLeft(y));

  const yearGroups = g
    .selectAll(".year-group")
    .data(processedData)
    .enter()
    .append("g")
    .attr("transform", (d) => `translate(${x0(d.year)},0)`);

  const bars = yearGroups
    .selectAll("rect")
    .data((d) => [{ key: "refugees", value: d.refugees }])
    .enter()
    .append("rect")
    .attr("x", (d) => x1(d.key))
    .attr("y", chartHeight)
    .attr("width", 60)
    .attr("height", 0)
    .attr("fill", (d) => color(d.key))
    .transition()
    .duration(3000)
    .delay((d, i) => i * 600)
    .attr("y", (d) => y(d.value))
    .attr("height", (d) => chartHeight - y(d.value));

  yearGroups
    .selectAll("text")
    .data((d) => [{ key: "refugees", value: d.refugees }])
    .enter()
    .append("text")
    .attr("x", (d) => x1.bandwidth() - 3)
    .attr("y", chartHeight)
    .text("0")
    .transition()
    .duration(3000)
    .delay((d, i) => i * 600)
    .attr("y", (d) => y(d.value) - 5)
    .tween("text", function (d) {
      const i = d3.interpolateRound(0, d.value / 1000);
      return function (t) {
        this.textContent = d3.format(",")(i(t));
      };
    });
});
