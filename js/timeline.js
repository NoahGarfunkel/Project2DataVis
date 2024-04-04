class TimeLine {

  /**
   * Class constructor with basic chart configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data, _dispatcher) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 800,
      containerHeight: _config.containerHeight || 240,
      margin: _config.margin || { top: 50, right: 50, bottom: 30, left: 50 }
    }
    this.data = _data;
    this.dispatcher = _dispatcher;

    this.initVis();
  }

  /**
   * Initialize scales/axes and append static chart elements
   */
  initVis() {
    let vis = this;

    vis.width = vis.config.containerWidth - vis.config.margin.left;
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
    vis.highlighted = vis.chart.append('g');

    vis.selectedOption = document.getElementById('color_attr').selectedOptions[0];

    var margin = { top: 20, right: 30, bottom: 50, left: 30 }

    vis.svg.append("text")
      .attr("text-anchor", "end")
      .attr("x", (vis.width / 2) + 3 * margin.left)
      .attr("y", margin.top)
      .text("Timeline");

    // Initialize the brush
    vis.brush = d3.brushX()
      .extent([[0, 0], [vis.width, vis.height]])
      .on('brush', function ({ selection }) {
        if (selection) vis.BrushMoved(selection);
      })
      .on('end', function ({ selection }) {
        if (!selection) vis.Brushed(null);
      });

    // Append the brush to the chart
    vis.brushG = vis.chart.append("g")
      .attr("class", "brush")
      .call(vis.brush);

    vis.brushG
      .on('mouseenter', () => {
        vis.tooltip.style('display', 'block');
      })
      .on('mouseleave', () => {
        vis.tooltip.style('display', 'none');
      })
      .on('mousemove', function (event) {
        // Get date that corresponds to current mouse x-coordinate
        let xPos = d3.pointer(event, vis.svg.node())[0] - 25; // First array element is x, second is y
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
    vis.brushTimer = null;
    vis.brushG.call(vis.brush);

    // Empty tooltip group (hidden by default)
    vis.tooltip = vis.chart.append('g')
      .attr('class', 'tooltip')
      .style('display', 'none');

    vis.tooltip.append('circle')
      .attr('r', 4);

    vis.tooltip.append('text');
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

    // Update the axes
    vis.xAxisG.call(vis.xAxis);
    vis.yAxisG.call(vis.yAxis);
  }


  BrushMoved(selection) {
    let vis = this;
    clearTimeout(vis.brushTimer);

    if (selection) {
      vis.brushTimer = setTimeout(() => {
        vis.Brushed(selection);
      }, 300);
    }
  }

  Brushed(selection) {
    let vis = this;
    clearTimeout(vis.brushTimer);

    if (!selection) {
      // If selection is null, reset the visualization and exit the method
      vis.dispatcher.call('reset', vis.event);
      return; // Exit the method early
    }

    // distance between years
    const yearDist = vis.xScale(1) - vis.xScale(0)
    const selectionStart = selection[0] - yearDist;
    const selectionEnd = selection[1] + yearDist;

    const selectedData = vis.data.filter(d => {
      const xVal = vis.xScale(d.year);
      return xVal > selectionStart && xVal < selectionEnd;
    });

    // Dispatch the selected data
    vis.dispatcher.call('filterVisualizations', vis.event, selectedData, vis.config.parentElement);

    // Reset all marks to their original color

    vis.marks.selectAll('.chart-line')
      .data([vis.data])
      .join('path')
      .attr('class', 'chart-line')
      .attr('d', vis.line);

    vis.highlighted.selectAll('.chart-line')
      .data([selectedData])
      .join('path')
      .attr('class', 'chart-line')
      .style('stroke', 'red')
      .attr('d', vis.line);
  }
  resetBrush() {
    this.brush.move(this.brushG, null);
    this.Brushed(null);
    this.highlighted.selectAll('.chart-line')
      .data([])
      .join('path')
      .attr('class', 'chart-line')
      .style('stroke', 'red')
      .attr('d', this.line);
  }
}
