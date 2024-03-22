d3.csv('data/ufo_sightings.csv')
.then(data => {

    data = data.filter(d => d.latitude !== "NA" && d.longitude !== "NA");

    data.forEach(d => {
      d.latitude = +d.latitude; //make sure these are not strings
      d.longitude = +d.longitude; //make sure these are not strings
      d.date_time = new Date(d.date_time)
      d.year = d.date_time.getFullYear();
      d.month = d.date_time.getMonth() + 1;
      d.time = d.date_time.getHours() + d.date_time.getMinutes()/60
    });
    const yearlyFrequency = Array.from(d3.rollup(data, v => v.length, d => d.year), ([year, frequency]) => ({year, frequency}));
    yearlyFrequency.sort((a, b) => a.year - b.year);
    // Initialize chart and then show it
    leafletMap = new LeafletMap({ parentElement: '#my-map'}, data);

    // Initialize chart and then show it
    timeline = new TimeLine({ parentElement: '#timeline'}, yearlyFrequency);

    d3.select(`#color_attr`).on('change', function() {
      const selectedOption = d3.select(this).property('value');
      
      // Update colors based on the selected option
      leafletMap.updateColors(selectedOption);
    });
    leafletMap.updateColors("year");
    timeline.updateVis();

    const monthlyFrequency = Array.from(d3.rollup(data, v => v.length, d => d.month), ([month, frequency]) => ({month, frequency}));

    monthlyFrequency.sort((a, b) => a.month - b.month);
    monthBarChart = new BarchartCustomizable ({ parentElement: "#monthBarChart"}, monthlyFrequency)
    monthBarChart.updateVis();

  
  })
  .catch(error => console.error(error));

  

