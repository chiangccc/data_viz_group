// 主程式
d3.csv("./data/bar_chart/all_countries.csv").then(function (rawData) {
    // 過濾資料：初始只移除值為 0 的資料
    let filteredData = rawData.filter(d => (+d["Refugees under UNHCR's mandate"] !== 0) && 
    (+d["Refugees under UNHCR's mandate"] > 20) &&
    (d["Country of origin"] !== "Serbia and Kosovo: S/RES/1244 (1999)") &&
    (d["Country of asylum"] !== "Serbia and Kosovo: S/RES/1244 (1999)"));
    
    // 初始化下拉選單
    createDropdownOptions(filteredData, "Year", "year-select");
    createDropdownOptions(filteredData, "Country of origin", "origin-select");
    createDropdownOptions(filteredData, "Country of asylum", "asylum-select");

    // 綁定篩選條件（下拉選單和門檻值）事件
    d3.selectAll("select, #threshold-select").on("change", function () {
        const filters = getDropdownValues();
        const threshold = +d3.select("#threshold-select").property("value"); // 獲取門檻值

        // 根據篩選條件篩選數據
        let currentFilteredData = filteredData.filter(d => +d["Refugees under UNHCR's mandate"] > threshold);

        if (filters.origin !== "all") {
            currentFilteredData = currentFilteredData.filter(d => d["Country of origin"] === filters.origin);
        }

        if (filters.asylum !== "all") {
            currentFilteredData = currentFilteredData.filter(d => d["Country of asylum"] === filters.asylum);
        }

    // 生成圖表數據並重新繪製
    const graph = makeGraph(currentFilteredData, filters.year, filters.origin, filters.asylum);
    clearCanvas();
    draw(graph);
});

    // 初始繪製
const initialGraph = makeGraph(filteredData, "2013", "all", "all",5000);
    draw(initialGraph);
});


// 建立下拉選單選項
function createDropdownOptions(data, field, elementId) {
    const uniqueValues = Array.from(new Set(data.map(d => d[field]))).sort();
    const dropdown = d3.select(`#${elementId}`);

    dropdown.append("option").text("All").attr("value", "all");
    

    uniqueValues.forEach(value => {
        dropdown.append("option").text(value).attr("value", value);
    });
        //dropdown.property("value", "all"); // 預設選中 All

}

// 取得下拉選單值
function getDropdownValues() {
    return {
        year: d3.select("#year-select").property("value"),
        origin: d3.select("#origin-select").property("value"),
        asylum: d3.select("#asylum-select").property("value"),
        threshold: d3.select("#threshold-select").property("value") // 新增門檻值
    };
}

// 清空畫布
function clearCanvas() {
    d3.select("#chart").selectAll("*").remove();
}


// 建立 Sankey 資料結構
function makeGraph(data, year, origin, asylum, threshold = 10000) {
    const graph = { nodes: [], links: [] };

    // 篩選資料
    const yearFilteredData = data.filter(d =>
        (year === "all" || d.Year === year) &&
        (origin === "all" || d["Country of origin"] === origin) &&
        (asylum === "all" || d["Country of asylum"] === asylum) &&
        (+d["Refugees under UNHCR's mandate"] >= threshold) // 應用門檻
    );

    const originMap = new Map();
    const asylumMap = new Map();

    yearFilteredData.forEach(d => {
        const origin = d["Country of origin"];
        const asylum = d["Country of asylum"];

        // 添加原籍國節點
        if (!originMap.has(origin)) {
            originMap.set(origin, graph.nodes.length);
            graph.nodes.push({ name: origin, role: "origin" });
        }

        // 添加庇護國節點
        if (!asylumMap.has(asylum)) {
            asylumMap.set(asylum, graph.nodes.length);
            graph.nodes.push({ name: asylum, role: "asylum" });
        }

        // 添加連線
        graph.links.push({
            source: originMap.get(origin),
            target: asylumMap.get(asylum),
            value: +d["Refugees under UNHCR's mandate"]
        });
    });

    return graph;
}

// 繪製 Sankey 圖表
function draw(graph, year) {
    const width = 1200;
    const height = Math.max(800, graph.nodes.length * 20);

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const sankey = d3.sankey()
        .nodeWidth(20)
        .nodePadding(30)
        .extent([[200, 50], [width - 200, height - 50]])
        .nodeAlign(d => (d.role === "origin" ? 0 : 1));

    const { nodes, links } = sankey(graph);

    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(nodes.map(d => d.name));

    const linkWidthMultiplier = year === "all" ? 1.5 : 5;

    const defs = svg.append("defs");
    // 為每條連線生成漸變
    links.forEach((d, i) => {
        const gradientId = `gradient-${i}`;
        const gradient = defs.append("linearGradient")
            .attr("id", gradientId)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", d.source.x1)
            .attr("x2", d.target.x0);

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", color(d.source.name))
            .attr("stop-opacity", 0.5); // 前端透明度降低

        gradient.append("stop")
            .attr("offset", "50%")
            .attr("stop-color", color(d.source.name))
            .attr("stop-opacity", 1); // 中間不透明

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", color(d.target.name))
            .attr("stop-opacity", 0.5); // 後端透明度降低
    });

    // 繪製連線
    const tooltip = createTooltip();
    svg.append("g")
        .selectAll("path")
        .data(links)
        .join("path")
        .attr("class", "link")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", d => color(d.source.name))
        .attr("stroke-width", d => Math.max(1, d.width* linkWidthMultiplier))
        .attr("stroke", (d, i) => `url(#gradient-${i})`) // 使用漸變
        .attr("fill", "none")
        .on("mouseover", (event, d) => tooltip.style("opacity", 1))
        .on("mousemove", (event, d) => {
            tooltip.html(`${d.source.name} to ${d.target.name} : ${d.value}`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 30}px`);
        })
        .on("mouseleave", () => {
            tooltip.transition().duration(200).style("opacity", 0);
        });

    // 繪製節點
    const nodeGroup = svg.append("g")
        .selectAll("g")
        .data(nodes)
        .join("g");

    nodeGroup.append("rect")
        .attr("x", d => d.x0 + 10)
        .attr("y", d => d.y0-5)
        .attr("width", d => d.x1 - d.x0 - 15)
        .attr("height", d => d.y1 - d.y0+10)
        .attr("fill", "black");

    nodeGroup.append("text")
        .attr("x", d => (d.role === "origin" ? d.x0 + 6 : d.x1 + 6))
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => (d.role === "origin" ? "end" : "start"))
        .text(d => d.name); // 顯示完整名稱
    }

// 建立 Tooltip
function createTooltip() {
    return d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "10px")
        .style("border-radius", "4px")
        .style("font-size", "14px")
        .style("font-family", "Arial")
        .style("pointer-events", "none")
        .style("opacity", 0);
}
