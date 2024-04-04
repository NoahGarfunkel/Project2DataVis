let clickTimeout;


class LeafletMap {

  /**
   * Class constructor with basic configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data, dispatcher) {
    this.config = {
      parentElement: _config.parentElement,
    }
    this.data = _data;
    this.selectedData = "year";
    this.dispatcher = dispatcher
    this.initVis();
  }

  /**
   * We initialize scales/axes and append static elements, such as axis titles.
   */
  initVis() {
    let vis = this;

    vis.inReset = false;
    //ESRI
    vis.esriUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    vis.esriAttr = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

    //TOPO
    vis.topoUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
    vis.topoAttr = 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'

    //Thunderforest Outdoors- requires key... so meh... 
    vis.thOutUrl = 'https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={apikey}';
    vis.thOutAttr = '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    //Stamen Terrain
    vis.stUrl = 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.{ext}';
    vis.stAttr = 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    var mapBounds = new L.LatLngBounds(
      new L.LatLng(-90, -180), // Southwest corner
      new L.LatLng(90, 180) // Northeast corner
    );

    //this is the base map layer, where we are showing the map background
    vis.base_layer = L.tileLayer(vis.topoUrl, {
      id: 'topo-image',
      attribution: vis.topoAttr,
      ext: 'png',
      noWrap: true,
      bounds: mapBounds
    });

    vis.theMap = L.map('my-map', {
      center: [0, 0],
      zoom: 2,
      layers: [vis.base_layer],
      worldCopyJump: false,
      maxBounds: mapBounds,
      maxBoundsViscosity: 1.0
    });

    //if you stopped here, you would just have a map

    //initialize svg for d3 to add to map
    L.svg({ clickable: true }).addTo(vis.theMap)// we have to make the svg layer clickable
    vis.overlay = d3.select(vis.theMap.getPanes().overlayPane)
    vis.svg = vis.overlay.select('svg').attr("pointer-events", "auto")

    //these are the city locations, displayed as a set of dots 
    vis.Dots = vis.svg.selectAll('circle')
      .data(vis.data)
      .join('circle')
      .attr("fill", "steelblue")
      .attr("stroke", "black")
      //Leaflet has to take control of projecting points. Here we are feeding the latitude and longitude coordinates to
      //leaflet so that it can project them on the coordinates of the view. Notice, we have to reverse lat and lon.
      //Finally, the returned conversion produces an x and y point. We have to select the the desired one using .x or .y
      .attr("cx", d => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).x)
      .attr("cy", d => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).y)
      .attr("r", 3)
      .on('mouseover', function (event, d) { //function to add mouseover event
        d3.select(this).transition() //D3 selects the object we have moused over in order to perform operations on it
          .duration('150') //how long we are transitioning between the two states (works like keyframes)
          .attr("fill", "red") //change the fill
          .attr('r', 4); //change radius

        //create a tool tip
        d3.select('#tooltip')
          .style('opacity', 1)
          .style('z-index', 1000000)
          // Format number with million and thousand separator
          .html(`<div class="tooltip-label"><strong>Latitude: ${d.latitude}, Longitude ${d3.format(',')(d.longitude)}</strong><br>
                                    <strong>Location: ${d.city_area}, ${d.country}</strong><br>
                                    Sighting Date: ${d.month}/${d.day}/${d.year}, Time: ${d.hour}:${d.minutes}<br>
                                    UFO Shape: ${d.ufo_shape}<br>
                                    Description: ${d.description}</div>`);

      })
      .on('mousemove', (event) => {
        //position the tooltip
        d3.select('#tooltip')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY + 10) + 'px');
      })
      .on('mouseleave', function () { //function to add mouseover event
        d3.select(this).transition() //D3 selects the object we have moused over in order to perform operations on it
          .duration('150') //how long we are transitioning between the two states (works like keyframes)
          .attr("fill", "steelblue") //change the fill
          .attr('r', 3) //change radius

        d3.select('#tooltip').style('opacity', 0);//turn off the tooltip

      })
      .on('click', (event, d) => { //experimental feature I was trying- click on point and then fly to it
        // vis.newZoom = vis.theMap.getZoom()+2;
        // if( vis.newZoom > 18)
        //  vis.newZoom = 18; 
        // vis.theMap.flyTo([d.latitude, d.longitude], vis.newZoom);
      });

    //handler here for updating the map, as you zoom in and out           
    vis.theMap.on("zoomend", function () {
      vis.updateVis();
      vis.updateColors(vis.selectedData);
    });
    // custom brush, initially none until it has been clicked
    vis.brush = null;
    vis.brushTimer = null;
    // can only brush when ctrl is being held down
    vis.canBrush = false;

    vis.theMap.on('click', function(e){
      // only if ctrl is held
      if (vis.canBrush){
        // first point
        if ( (!vis.brush) || vis.brush.point2){
          vis.brush = new CustomBrush(e.latlng.lat, e.latlng.lng);
          clickTimeout = setTimeout( () => {
            vis.brush = null;
            console.log("Resetting brush on map.")
          }, 3000
          )
        }
        // second point
        else if ( !vis.brush.point2){
          clearTimeout(clickTimeout);
          vis.brush.point2 = [e.latlng.lat, e.latlng.lng];
          vis.brushed()
        }
      }
    }
    )
    
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Control') {
        vis.toggleDragging(false);
        vis.canBrush = true;
      }
    });
  
    // Disable map dragging when Ctrl key is released
    document.addEventListener('keyup', function (e) {
      if (e.key === 'Control') {
        vis.toggleDragging(true);
        vis.canBrush = false;
      }
    });
  }

  updateVis() {
    let vis = this;

    vis.Dots.remove();

    //redraw based on new zoom- need to recalculate on-screen position
    vis.Dots = vis.svg.selectAll('circle')
      .data(vis.data)
      .join('circle')
      .attr("stroke", "black")
      //Leaflet has to take control of projecting points. Here we are feeding the latitude and longitude coordinates to
      //leaflet so that it can project them on the coordinates of the view. Notice, we have to reverse lat and lon.
      //Finally, the returned conversion produces an x and y point. We have to select the the desired one using .x or .y
      .attr("cx", d => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).x)
      .attr("cy", d => vis.theMap.latLngToLayerPoint([d.latitude, d.longitude]).y)
      .attr("r", 3)
      .on('mouseover', function (event, d) { //function to add mouseover event
        d3.select(this).transition() //D3 selects the object we have moused over in order to perform operations on it
          .duration('150')//how long we are transitioning between the two states (works like keyframes)
          .attr('origfill', this.getAttribute('fill')) 
          .attr("fill", "red") //change the fill
          .attr('r', 10); //change radius

        //create a tool tip
        d3.select('#tooltip')
          .style('opacity', 1)
          .style('z-index', 1000000)
          // Format number with million and thousand separator
          .html(`<div class="tooltip-label"><strong>Latitude: ${d.latitude}, Longitude ${d3.format(',')(d.longitude)}</strong><br>
                    <strong>Location: ${d.city_area}, ${d.country}</strong><br>
                    Sighting Date: ${d.month}/${d.day}/${d.year}, Time: ${d.hour}:${d.minutes}<br>
                    UFO Shape: ${d.ufo_shape}<br>
                    Description: ${d.description}</div>`);

      })
      .on('mousemove', (event) => {
        //position the tooltip
        d3.select('#tooltip')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY + 10) + 'px');
      })
      .on('mouseleave', function () { //function to add mouseover event
        d3.select(this).transition() //D3 selects the object we have moused over in order to perform operations on it
          .duration('150')//how long we are transitioning between the two states (works like keyframes)
          .attr('fill', this.getAttribute('origfill')) 
          .attr('r', 3) //change radius

        d3.select('#tooltip').style('opacity', 0);//turn off the tooltip

      });
      vis.renderVis();
  }

  getColorScale(){
    let vis = this;

    const ShapeScale = d3.scaleOrdinal(
      ["light", "circle", "triangle", "unknown", "sphere", "fireball", "changing", "chevron", "cigar", "cone",
        "cross", "cylinder", "diamond", "disk", "egg", "flash", "formation", "other", "rectangle", "teardrop"],
      ["yellow", "blue", "green", "gray", "red", "orange", "pink", "burlywood", "brown", "dodgerblue",
        "chocolate", "crimson", "floralwhite", "darkgreen", "gainsboro", "gold", "darkred", "silver", "olive", "cornflowerblue"]
    )

    // Define color scales based on the selected option
    let colorScale;
    switch (vis.selectedData) {
      case 'year':
        colorScale = d3.scaleLinear()
          .domain(d3.extent(vis.data, d => d.year))
          .range(['white', 'blue']);
        break;
      case 'month':
        colorScale = d3.scaleLinear()
          .domain(d3.extent(vis.data, d => d.month))
          .range(['white', 'blue']);
        break;
      case 'timeOfDay':
        colorScale = d3.scaleLinear()
          .domain(d3.extent(vis.data, d => d.time))
          .range(['white', 'blue']);
        break;
      case 'ufo_shape':
        colorScale = ShapeScale; // Categorical color scheme
        break;
      default:
        colorScale = d3.scaleOrdinal()
          .domain(vis.data.map(d => d.defaultCategory))
          .range(['gray']); // Default color
    }
    return colorScale;
  }

  updateColors(colorBy) {
    let vis = this;
    vis.selectedData = colorBy;
    let colorScale = vis.getColorScale();

    // Update the fill color of the dots based on the selected option
    vis.Dots.attr("fill", d => colorScale(vis.getColorValue(d, colorBy)));
  }

  // Helper method to get the color value based on the selected option
  getColorValue(d, colorBy) {
    switch (colorBy) {
      case 'year':
        return d.year;
      case 'month':
        return d.month;
      case 'timeOfDay':
        return d.time;
      case 'ufo_shape':
        return d.ufo_shape;
      default:
        return 'defaultCategory';
    }
  }

  renderVis() {
    let vis = this;
    // Clear previous rectangles
    vis.svg.selectAll('.brush-rectangle').remove();

    // Check if a brush exists
    if (vis.brush && vis.brush.point2) {
      // Get the coordinates of the brush
      let [px1, py1, px2, py2] = vis.brush.extents();
      let x1 = vis.theMap.latLngToLayerPoint([px1, py1]).x;
      let y2 = vis.theMap.latLngToLayerPoint([px1, py1]).y;
      let x2 = vis.theMap.latLngToLayerPoint([px2, py2]).x;
      let y1 = vis.theMap.latLngToLayerPoint([px2, py2]).y;
      // Draw the rectangle
      vis.svg.append('rect')
        .attr('class', 'brush-rectangle')
        .attr('x', x1)
        .attr('y', y1)
        .attr('width', x2 - x1)
        .attr('height', y2 - y1)
        .style('stroke', 'gray')
        .style('fill', 'gray')
        .style('opacity', 0.3)
        .style('stroke-width', '2px');
    }

  }
  changeBackground(newValue) {
    let vis = this;

    // Determine the URL and attribution based on the newValue
    let url, attr;
    if (newValue == 0) {
      url = vis.osUrl;
      attr = vis.osAttr;
    } else if (newValue == 1) {
      url = vis.esriUrl;
      attr = vis.esriAttr;
    } else if (newValue == 2) {
      url = vis.topoUrl;
      attr = vis.topoAttr;
    } else if (newValue == 3) {
      url = vis.opnvUrl;
      attr = vis.opnvAttr;
    }
    else if (newValue == 4) {
      url = vis.asdUrl;
      attr = vis.asdAttr;
    }

    // Remove the current base layer
    vis.theMap.removeLayer(vis.base_layer);

    // Add the new base layer
    vis.base_layer = L.tileLayer(url, {
      attribution: attr,
      ext: 'png',
      noWrap: true,
      bounds: vis.theMap.getBounds()
    });
    vis.theMap.addLayer(vis.base_layer);
  }

  brushed() {
    let vis = this;
    vis.dispatcher.call('resetData', vis.event, vis.config.parentElement);

    const [lat1,lng1, lat2, lng2] = vis.brush.extents();
    const selectedData = vis.data.filter(d => {
      const lat = d.latitude
      const lng = d.longitude
      return lat > lat1 && lat < lat2 && lng > lng1 && lng < lng2;
    });

    // Dispatch the selected data
    vis.dispatcher.call('filterVisualizations', vis.event, selectedData, vis.config.parentElement);
    vis.renderVis();
  }

  resetBrush() {
    this.inReset = true;
    if (this.brush && (!this.inReset)){
      this.dispatcher.call('reset', this.event);
    }
    this.brush = null;
    this.renderVis();
    this.inReset = false;
  }

  // toggles off dragging for when the user is selecting a brush
  toggleDragging(enableDragging){
    let vis = this;
    if (enableDragging){
      vis.theMap.dragging.enable();
    } else{
      vis.theMap.dragging.disable();
    }
  }

}

class CustomBrush {
  constructor(startX, startY) {
    this.point1 = [startX, startY];
    this.point2 = null;
  }

  extents() {
    // get the extents of the rectangle
    let x1 = Math.min(this.point1[0], this.point2[0])
    let x2 = Math.max(this.point1[0], this.point2[0])
    let y1 = Math.min(this.point1[1], this.point2[1])
    let y2 = Math.max(this.point1[1], this.point2[1])
    return [x1, y1, x2, y2]
  }
}
