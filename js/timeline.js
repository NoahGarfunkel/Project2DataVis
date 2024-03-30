class TimeLine {

    /**
     * Class constructor with basic chart configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data) {
      this.config = {
        parentElement: _config.parentElement,
        containerWidth: _config.containerWidth || 800,
        containerHeight: _config.containerHeight || 240,
        margin: _config.margin || {top: 50, right: 200, bottom: 30, left: 50}
      }
      this.data = _data;
      this.initVis();
    }
    
    /**
     * Initialize scales/axes and append static chart elements
     */
    initVis() {
      let vis = this;
  
      vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
      vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;
  
      vis.xScale = d3.scaleTime()
          .range([0, vis.width]);
  
      vis.yScale = d3.scaleLinear()
          .range([vis.height, 0])
          .nice();
  
      // Initialize axes
      vis.xAxis = d3.axisBottom(vis.xScale)
          .ticks(6)
          .tickSizeOuter(0)
          .tickPadding(10)
          .tickFormat(d3.format(".4"));
  
      vis.yAxis = d3.axisLeft(vis.yScale)
          .ticks(4)
          .tickSizeOuter(0)
          .tickPadding(10);
  
      // Define size of SVG drawing area
      vis.svg = d3.select(vis.config.parentElement)
          .attr('width', vis.config.containerWidth)
          .attr('height', vis.config.containerHeight);

      // vis.svg.append('text')
      //     .attr('class', 'x-axis-label')
      //     .attr('transform', translate(${vis.width / 2}, ${vis.height + vis.config.margin.bottom/ 1.25}))
      //     .style('text-anchor', 'middle')
      //     .text(vis.dataTypeLabels[vis.selectedDataType]);

          
      // Append group element that will contain our actual chart (see margin convention)
      vis.chart = vis.svg.append('g')
          .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
  
      // Append empty x-axis group and move it to the bottom of the chart
      vis.xAxisG = vis.chart.append('g')
          .attr('class', 'axis x-axis')
          .attr('transform', `translate(0,${vis.height})`);
      
      // Append y-axis group
      vis.yAxisG = vis.chart.append('g')
          .attr('class', 'axis y-axis');
  
      // We need to make sure that the tracking area is on top of other chart elements
      vis.marks = vis.chart.append('g');
      vis.trackingArea = vis.chart.append('rect')
          .attr('width', vis.width)
          .attr('height', vis.height)
          .attr('fill', 'none')
          .attr('pointer-events', 'all');
  
          //(event,d) => {
  
      // Empty tooltip group (hidden by default)
      vis.tooltip = vis.chart.append('g')
          .attr('class', 'tooltip')
          .style('display', 'none');
  
      vis.tooltip.append('circle')
          .attr('r', 4);
  
      vis.tooltip.append('text');

      vis.selectedOption = document.getElementById('color_attr').selectedOptions[0];

      var margin = {top: 20, right: 30, bottom: 50, left: 30}

      vis.svg.append("text")
            .attr("text-anchor", "end")
            .attr("x", (vis.width / 2) + 2 * margin.left)
            .attr("y", margin.top)
            .text("Timeline");
        }
  
    /**
     * Prepare the data and scales before we render it.
     */
    updateVis() {
      let vis = this;
      
      vis.xValue = d => d.year;
      vis.yValue = d => d.frequency;
  
      vis.line = d3.line()
          .x(d => vis.xScale(vis.xValue(d)))
          .y(d => vis.yScale(vis.yValue(d)))
          .curve(d3.curveLinear);
  
      // Set the scale input domains
      vis.xScale.domain(d3.extent(vis.data, vis.xValue));
      vis.yScale.domain(d3.extent(vis.data, vis.yValue));
  
      vis.bisectDate = d3.bisector(vis.xValue).left;
  
      vis.renderVis();
    }
  
    /**
     * Bind data to visual elements
     */
    renderVis() {
      let vis = this;
  
      // Add line path
      vis.marks.selectAll('.chart-line')
          .data([vis.data])
        .join('path')
          .attr('class', 'chart-line')
          .attr('d', vis.line);
  
      vis.trackingArea
          .on('mouseenter', () => {
            vis.tooltip.style('display', 'block');
          })
          .on('mouseleave', () => {
            vis.tooltip.style('display', 'none');
          })
          .on('mousemove', function(event) {
            // Get date that corresponds to current mouse x-coordinate
            let xPos = d3.pointer(event, vis)[0]; // First array element is x, second is y
            let date = vis.xScale.invert(xPos);
  
            // Find nearest data point
            let index = vis.bisectDate(vis.data, date, 1);
            let a = vis.data[index - 1];
            let b = vis.data[index];
            let d = b && (date - a.year > b.year - date) ? b : a; 
  
            // Update tooltip
            vis.tooltip.select('circle')
                .attr('transform', `translate(${vis.xScale(d.year)},${vis.yScale(d.frequency)})`);
            
            vis.tooltip.select('text')
                .attr('transform', `translate(${vis.xScale(d.year)},${(vis.yScale(d.frequency) - 15)})`)
                .text(`${d.year}: ${Math.round(d.frequency)} Sightings`);
          });
      
      // Update the axes
      vis.xAxisG.call(vis.xAxis);
      vis.yAxisG.call(vis.yAxis);
    }
  }
