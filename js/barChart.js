class BarchartCustomizable {
 constructor(_config, _data, _column, _dispatcher, _displayString) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 710,
      containerHeight: _config.containerHeight || 200,
      margin: _config.margin || {top: 10, right: 5, bottom: 75, left: 40},
      reverseOrder: _config.reverseOrder || false,
      tooltipPadding: _config.tooltipPadding || 15
    }
    this.data = _data;
    this.column = _column;
    this.dispatcher = _dispatcher;
    this.displayString = _displayString;
    this.initVis();
 }

 initVis() {
    let vis = this;

    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    vis.yScale = d3.scaleLinear()
        .range([vis.height, 0]) 

    vis.xScale = d3.scaleBand()
        .range([0, vis.width])
        .paddingInner(0.1);

    vis.xAxis = d3.axisBottom(vis.xScale)
        .tickSizeOuter(0)
        .tickFormat(d => d)
        .tickPadding(10)
        .tickSizeInner(0);

    vis.yAxis = d3.axisLeft(vis.yScale)
        .ticks(6)
        .tickSizeOuter(0)
        .tickFormat(d => d);

    vis.svg = d3.select(vis.config.parentElement)
        .attr('width', vis.config.containerWidth)
        .attr('height', vis.config.containerHeight);

    vis.chart = vis.svg.append('g')
        .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top + 30})`);

    vis.xAxisG = vis.chart.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0,${vis.height})`);
    
    vis.yAxisG = vis.chart.append('g')
        .attr('class', 'axis y-axis');
    
     // Initialize the brush
    vis.brush = d3.brushX()
        .extent([[0, 0], [vis.width, vis.height]])
        .on('brush', function({selection}) {
            if (selection) vis.BrushMoved(selection);
          })
          .on('end', function({selection}) {
            if (!selection) vis.Brushed(null);
          });

     // Append the brush to the chart
    vis.brushG = vis.chart.append("g")
        .attr("class", "brush")
        .call(vis.brush);

    vis.brushTimer = null;

    var margin = {top: 20, right: 30, bottom: 50, left: 30}

	vis.svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", (vis.width / 2) + margin.left)
        .attr("y", margin.top)
        .text(this.displayString);
 }

 updateVis() {
    let vis = this;

    // Set the scale input domains
    vis.xScale.domain(vis.data.map(d => d[vis.column]));
    vis.yScale.domain([0, d3.max(vis.data, d => d.frequency)]);

    vis.renderVis();
 }

 renderVis() {
    let vis = this;

    // Add rectangles
    let bars = vis.chart.selectAll('.bar')
        .data(vis.data, d => d[vis.column])
      .join('rect')
        .attr('class', 'bar')
        .attr('x', d => vis.xScale(d[vis.column]))
        .attr('width', vis.xScale.bandwidth())
        .attr('y', d => vis.yScale(d.frequency))
        .attr('height', d => vis.height - vis.yScale(d.frequency))
        .style('fill', 'steelblue') // Set the fill color to steel blue
        .on('mouseenter', function(event, d) {
            // Show tooltip
            d3.select('#tooltip')
                .style('opacity', 1)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY + 10) + 'px')
                .html(`<div class="tooltip-label">${vis.displayString}: ${d[vis.column]}<br>
                    Frequency: ${d.frequency}</div>`);
        })
        .on('mouseleave', function() {
            // Hide tooltip
            d3.select('#tooltip').style('opacity', 0);
        });
    
    vis.xAxisG.call(vis.xAxis)
        .selectAll('.tick text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');
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

    const selectionStart = selection[0];
    const selectionEnd = selection[1];

    const selectedData = vis.data.filter(d => {
    const barX = vis.xScale(d[vis.column]);
    const barWidth = vis.xScale.bandwidth();
    return barX + barWidth > selection[0] && barX < selection[1];
});

    // Dispatch the selected data
    vis.dispatcher.call('filterVisualizations', vis.event, selectedData, vis.config.parentElement);

    // Reset all bars to their original color
    vis.chart.selectAll('.bar')
        .style('fill', 'steelblue');

    // Change the color of bars within the selection
    vis.chart.selectAll('.bar')
        .filter(d => {
            const barX = vis.xScale(d[vis.column]);
            const barWidth = vis.xScale.bandwidth();
        return barX + barWidth > selectionStart && barX < selectionEnd;
        })
        .style('fill', 'red');
}

resetBrush(){
    this.brush.move(this.brushG, null);
    this.Brushed(null);
}
}
