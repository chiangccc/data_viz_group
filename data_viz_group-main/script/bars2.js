const stackedSvg = d3.select("#stacked-bars-plot");
const stackedMargin = { top: 20, right: 30, bottom: 30, left: 300 };
const stackedWidth =
  +stackedSvg.attr("width") - stackedMargin.left - stackedMargin.right;
const stackedBarHeight = 30;
const stackedBarSpacing = 10;

const chart = stackedSvg
  .append("g")
  .attr("transform", `translate(${stackedMargin.left},${stackedMargin.top})`);

const xScale = d3.scaleLinear().range([0, stackedWidth]);
const yScale = d3.scaleBand().padding(0.2);

const xAxisGroup = chart.append("g");
const yAxisGroup = chart.append("g").attr("transform", `translate(0, 0)`);

const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("background", "rgba(0, 0, 0, 0.8)")
  .style("color", "white")
  .style("padding", "5px 10px")
  .style("border-radius", "5px")
  .style("pointer-events", "none")
  .style("opacity", 0);

const menu1 = d3.select("#asylum_origin_menu");

const yearCheckboxes = d3.selectAll(".year-checkbox");

const continentFiles = {
  Europe: "./data/bar_chart/europe.csv",
  "Asia and The Pacific": "./data/bar_chart/asia_and_the_pacific.csv",
  "Southern Africa": "./data/bar_chart/southern_africa.csv",
  "West and Central Africa": "./data/bar_chart/west_and_central_africa.csv",
  "Middle East North Africa": "./data/bar_chart/middle_east_north_africa.csv",
  America: "./data/bar_chart/americas.csv",
  "East Horn Of Africa": "./data/bar_chart/east_horn_of_Africa.csv",
  All: "./data/bar_chart/all_countries.csv",
};

const yearColors = {
  2013: "#740938",
  2014: "#FFB38E",
  2015: "#DE8F5F",
  2016: "#624E88",
  2017: "#CB80AB",
  2018: "#343131",
  2019: "#A04747",
  2020: "#C7253E",
  2021: "#821131",
  2022: "#522258",
  2023: "#D95F59",
};

const updateChart = (filePath) => {
  d3.csv(filePath).then((data) => {
    data.forEach((d) => {
      d["Refugees under UNHCR's mandate"] =
        +d["Refugees under UNHCR's mandate"];
    });

    const selectedYears = Array.from(yearCheckboxes.nodes())
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);

    const filteredData = data.filter((d) => selectedYears.includes(d.Year));

    const groupBy =
      menu1.property("value") === "asylum"
        ? "Country of asylum"
        : "Country of origin";
    // const sortOrder = menu2.property("value");

    const aggregatedData = d3
      .rollups(
        filteredData,
        (v) =>
          d3.rollups(
            v,
            (yearGroup) =>
              d3.sum(yearGroup, (d) => d["Refugees under UNHCR's mandate"]),
            (d) => d.Year
          ),
        (d) => d[groupBy]
      )
      .map(([country, years]) => ({
        country,
        years: years.map(([year, value]) => ({ year, value })),
        total: d3.sum(years, ([, value]) => value),
      }));

    aggregatedData.sort((a, b) => d3.descending(a.total, b.total));

    const top10Data = aggregatedData.slice(0, 10);

    const chartHeight =
      top10Data.length * (stackedBarHeight + stackedBarSpacing);
    stackedSvg.attr(
      "height",
      chartHeight + stackedMargin.top + stackedMargin.bottom
    );

    yScale.domain(top10Data.map((d) => d.country)).range([0, chartHeight]);
    xScale.domain([0, d3.max(top10Data, (d) => d.total)]);

    xAxisGroup
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale));
    yAxisGroup.call(d3.axisLeft(yScale));

    const bars = chart
      .selectAll(".bar-group")
      .data(top10Data, (d) => d.country);

    const barsEnter = bars.enter().append("g").attr("class", "bar-group");

    barsEnter
      .merge(bars)
      .attr("transform", (d) => `translate(0,${yScale(d.country)})`);

    const stackedBars = bars
      .merge(barsEnter)
      .selectAll("rect")
      .data(
        (d) => d.years,
        (d) => d.year
      );

    stackedBars
      .enter()
      .append("rect")
      .merge(stackedBars)
      .attr("x", (d, i, nodes) => {
        const previousValues = nodes
          .slice(0, i)
          .reduce((sum, node) => sum + xScale(node.__data__.value), 0);
        return previousValues;
      })
      .attr("y", 0)
      .attr("height", yScale.bandwidth())
      .attr("width", (d) => xScale(d.value))
      .attr("fill", (d) => yearColors[d.year])
      .on("mouseover", function (event, d) {
        const format = d3.format(",");
        d3.select(this).attr("stroke", "black").attr("stroke-width", 2);
        tooltip
          .style("opacity", 1)
          .html(`<b>${d.year}</b><br>Refugees: ${format(d.value)}`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 20 + "px");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 20 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "none");
        tooltip.style("opacity", 0);
      });

    stackedBars.exit().remove();

    bars.exit().remove();
  });
};

const buttons = d3.selectAll(".nav-link");
buttons.on("click", function () {
  buttons.classed("active", false);
  d3.select(this).classed("active", true);

  const continent = d3.select(this).text();
  const filePath = continentFiles[continent] || continentFiles["All"];
  updateChart(filePath);
});

menu1.on("change", () => {
  const activeContinent = d3.select(".nav-link.active").text();
  const filePath = continentFiles[activeContinent] || continentFiles["All"];
  updateChart(filePath);
});

yearCheckboxes.on("change", () => {
  const activeContinent = d3.select(".nav-link.active").text();
  const filePath = continentFiles[activeContinent] || continentFiles["All"];
  updateChart(filePath);
});

updateChart(continentFiles["Europe"]);
