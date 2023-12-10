// Set the dimensions and margins of the graph
const margin = {top: 10, right: 30, bottom: 30, left: 60},
      width = 700 - margin.left - margin.right,
      height = 300 - margin.top - margin.bottom;

const svg = d3.select("#lineGraph")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
    
const mapSvg = d3.select("#worldMap"),
    mapWidth = +svg.attr("width", 960),
    mapHeight = +svg.attr("height", 700);
        
// Map and projection
const projection = d3.geoMercator()
    .scale(960/Math.PI/2)
    .translate([680,480]);

const barMargin = { top: 20, right: 20, bottom: 30, left: 40 },
      barWidth = 600 - barMargin.left - barMargin.right, // Adjust width as needed
      barHeight = 300 - barMargin.top - barMargin.bottom; // Adjust height as needed

const barSvg = d3.select("#barChart")
  .append("svg")
    .attr("width", barWidth + barMargin.left + barMargin.right)
    .attr("height", barHeight + barMargin.top + barMargin.bottom)
  .append("g")
    .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

const x0 = d3.scaleBand()
    .range([0, barWidth])
    .padding(0.1);

const x1 = d3.scaleBand()
    .padding(0.05);

const y = d3.scaleLinear()
    .range([barHeight, 0]);
    

const tooltip = d3.select("#tooltip");

const barTooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("text-align", "center")
    .style("padding", "6px")
    .style("background-color", "white")
    .style("border", "solid 1px #aaa")
    .style("border-radius", "4px")
    .style("pointer-events", "none");



// Read the data and populate dropdown
d3.csv("life expectancy.csv").then(function(data) {
    // Extract unique country names for dropdown
    const countries = Array.from(new Set(data.map(d => d["Country Name"])));
    d3.select("#countrySelect")
      .selectAll("option")
      .data(countries)
      .enter()
      .append("option")
      .text(d => d)
      .attr("value", d => d);
      
    mapDraw();

    updateGraph(countries[0]); // Initialize with first country's data

    d3.select("#countrySelect").on("change", function(event) {
        updateGraph(this.value);
    });
    
    function mapDraw(){
        d3.json("WorldGeo.geojson").then( function(json) {
            d3.csv("life expectancy.csv").then(function(data){
                var color =  d3.scaleLinear().range(["#ff0000", "#00ff00"]); // Red to green
                color.domain([
        					d3.min(data, function(d) { if (d.Year == 2019 && d["Life Expectancy World Bank"]){
    					   		    return d["Life Expectancy World Bank"];
    					   		    } }), 
        					d3.max(data, function(d) { if (d.Year == 2019 && d["Life Expectancy World Bank"]){
    					   		    return d["Life Expectancy World Bank"];
    					   		    } })
        				]);
        		
        		let mouseClick = function(event, d) {
        		    var country = d.properties.name;
        		    updateGraph(country);
        		    mapDraw();
        		};
        		
        		let mouseOver = function(event, d) {
                    d3.selectAll("path")
                      .style("opacity", .5)
                    d3.select(this)
                      .style("opacity", 1)
                      .style("stroke", "#000")
                    tooltip
                        .style("opacity", 1)
                        .html("Country: " + d.properties.name + "<br>Life Expectancy: " + d.properties.life)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 15) + "px");
                  };
                
                  let mouseLeave = function(d) {
                    d3.selectAll("path")
                      .style("opacity", .8)
                    d3.select(this)
                      .style("stroke", "#fff")
                    tooltip.style("opacity", 0);
                  };
        		
                // Draw the map
                mapSvg.append("g")
                    .selectAll("path")
                    .data(json.features)
                    .join("path")
                        .attr("d", d3.geoPath()
                        .projection(projection)
                        )
                        .style("stroke", "#fff")
                        .attr("fill", function (d){
                            var country = d.properties.name;
    					   		//Get data value for the country
    					   		var value = data.find(function(d){
    					   		    if (d.Year == 2019){
    					   		    return d["Country Name"] === country || d["Country Code"] === country;
    					   		    }
    					   		});
    					   		//Fill country based on value
    					   		if (value) {
    					   			//If value exists…
    					   			d.properties.life = value["Life Expectancy World Bank"];
    						   		return color(value["Life Expectancy World Bank"]);
    					   		} else {
    					   			//If value is undefined…
    						   		return "#ccc";
    				   		}
                        })
                        .style("opacity", .8)
                        .on("mouseover", mouseOver )
                        .on("mouseleave", mouseLeave )
                        .on("click", mouseClick)
            }
            );
        })}

    function updateGraph(selectedCountry) {
        // Filter data for the selected country
    const filteredData = data.filter(d => d["Country Name"] === selectedCountry);

        // Format the data
        filteredData.forEach(function(d) {
            d.Year = +d.Year;
            d["Life Expectancy World Bank"] = +d["Life Expectancy World Bank"];
        });
        
        // Prepare bar chart data
        const barChartData = filteredData.map(d => ({
            year: d.Year,
            healthExpenditure: +d["Health Expenditure %"],
            educationExpenditure: +d["Education Expenditure %"]
        }));
        
        // Clear existing bar chart
        barSvg.selectAll("*").remove();
        
        // Update scales for the bar chart
        x0.domain(barChartData.map(d => d.year));
        y.domain([0, d3.max(barChartData, d => Math.max(d.healthExpenditure, d.educationExpenditure))]);
        
        // Append the x-axis to the bar chart
    barSvg.append("g")
        .attr("transform", `translate(0, ${barHeight})`)
        .call(d3.axisBottom(x0));

    // Append the y-axis to the bar chart
    barSvg.append("g")
        .call(d3.axisLeft(y));

    // Add X-axis label
    barSvg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", barWidth / 2)
        .attr("y", barHeight + barMargin.bottom)
        .text("Year");

    // Add Y-axis label
    barSvg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -barHeight / 2)
        .attr("y", -barMargin.left + 15)
        .text("% of GDP");
    
    // Create health expenditure bars
    barSvg.selectAll(".bar.health")
        .data(barChartData)
        .enter().append("rect")
        .attr("class", "bar health")
        .attr("x", d => x0(d.year))
        .attr("y", d => y(d.healthExpenditure))
        .attr("width", x0.bandwidth() / 2)
        .attr("height", d => barHeight - y(d.healthExpenditure))
        .attr("fill", "orange")
        .attr("transform", "translate(0,0)") // This keeps the bar at its original position
        .on("mouseover", function(event, d) {
            barTooltip.transition().duration(200).style("opacity", .9);
            barTooltip.html("Year: " + d.year + "<br/>Health Expenditure: " + d.healthExpenditure + "%")
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            barTooltip.transition().duration(500).style("opacity", 0);
        });

    // Create education expenditure bars
    barSvg.selectAll(".bar.education")
        .data(barChartData)
        .enter().append("rect")
        .attr("class", "bar education")
        .attr("x", d => x0(d.year) + x0.bandwidth() / 2) // Offset by half the bandwidth
        .attr("y", d => y(d.educationExpenditure))
        .attr("width", x0.bandwidth() / 2)
        .attr("height", d => barHeight - y(d.educationExpenditure))
        .attr("fill", "green")
        .attr("transform", "translate(0,0)")
        .on("mouseover", function(event, d) {
            barTooltip.transition().duration(200).style("opacity", .9);
            barTooltip.html("Year: " + d.year + "<br/>Education Expenditure: " + d.educationExpenditure + "%")
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            barTooltip.transition().duration(500).style("opacity", 0);
        });
        
        
        // Scale the range of the data
        const x = d3.scaleLinear()
          .domain(d3.extent(filteredData, function(d) { return d.Year; }))
          .range([0, width]);
        const yLine = d3.scaleLinear()
          .domain([0, d3.max(filteredData, function(d) { return d["Life Expectancy World Bank"]; })])
          .range([height, 0]);
        

        // Clear any existing graph
        svg.selectAll("*").remove();

        // Add X and Y axes
        svg.append("g")
          .attr("transform", `translate(0, ${height})`)
          .call(d3.axisBottom(x));
        svg.append("g")
          .call(d3.axisLeft(yLine));

        // Add the line
        svg.append("path")
          .datum(filteredData)
          .attr("fill", "none")
          .attr("stroke", "steelblue")
          .attr("stroke-width", 1.5)
          .attr("d", d3.line()
            .x(function(d) { return x(d.Year); })
            .y(function(d) { return yLine(d["Life Expectancy World Bank"]); })
    );
        // Add points
        svg.selectAll("dot")
            .data(filteredData)
          .enter().append("circle")
            .attr("r", 5)
            .attr("cx", function(d) { return x(d.Year); })
            .attr("cy", function(d) { return yLine(d["Life Expectancy World Bank"]); })
            .style("fill", "orange")
            .on("mouseover", function(event, d) {
            tooltip
                .style("opacity", 1)
                .html("Year: " + d.Year + "<br>Life Expectancy: " + d["Life Expectancy World Bank"])
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 15) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("opacity", 0);
            });
            // Add X-axis label
            svg.append("text")
                .attr("text-anchor", "middle")
                .attr("x", width / 2)
                .attr("y", height + margin.bottom)
                .text("Year");
        
            // Add Y-axis label
            svg.append("text")
                .attr("text-anchor", "middle")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -margin.left + 25)
                .text("Life Expectancy");
    
    }
});


