d3.csv('data/ufo_sightings.csv')
.then(data => {

    data = data.filter(d => d.latitude !== "NA" && d.longitude !== "NA");

    data.forEach(d => {
      d.latitude = +d.latitude; //make sure these are not strings
      d.longitude = +d.longitude; //make sure these are not strings
      d.year = new Date(d.date_time).getFullYear();
      d.month = new Date(d.date_time).getMonth() + 1;

      d.date_time = new Date(d.date_time)
      d.time = d.date_time.getHours() + d.date_time.getMinutes()/60
    });

    // Initialize chart and then show it
    leafletMap = new LeafletMap({ parentElement: '#my-map'}, data);

    d3.select(`#color_attr`).on('change', function() {
      const selectedOption = d3.select(this).property('value');
      
      // Update colors based on the selected option
      leafletMap.updateColors(selectedOption);
    });
    leafletMap.updateColors("year");
    
  })
  .catch(error => console.error(error));
  

