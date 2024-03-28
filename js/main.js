let filteredData;
const dispatcher = d3.dispatch('filterVisualizations', 'reset')

d3.csv('data/ufo_sightings.csv')
.then(data => {

    data = data.filter(d => d.latitude !== "NA" && d.longitude !== "NA" && d.ufo_shape !== "NA");
    data.forEach(d => {
      d.latitude = +d.latitude; //make sure these are not strings
      d.longitude = +d.longitude; //make sure these are not strings
      d.date_time = new Date(d.date_time)
      d.year = d.date_time.getFullYear();
      d.month = d.date_time.getMonth() + 1;
      d.time = d.date_time.getHours() + d.date_time.getMinutes()/60;
    });

    filteredData = data;

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

    const monthBarChart = new BarchartCustomizable({ parentElement: "#monthBarChart", containerHeight: 400}, monthlyFrequency, "month", dispatcher);
    monthBarChart.updateVis();

    const shapeFrequency = Array.from(d3.rollup(data, v => v.length, d => d.ufo_shape), ([shape, frequency]) => ({shape, frequency}));
    shapeFrequency.sort((a, b) => a.shape.localeCompare(b.shape));

    const shapeBarChart = new BarchartCustomizable({ parentElement: "#shapeBarChart", containerHeight: 400}, shapeFrequency, "shape");
    shapeBarChart.updateVis();

    function getHourOfDay(date_time) {
      return date_time.getHours();
     }
     
    const timeOfDayFrequency = Array.from(d3.rollup(data, v => v.length, d => getHourOfDay(d.date_time)), ([hour, frequency]) => ({hour, frequency}));
    timeOfDayFrequency.sort((a, b) => a.hour - b.hour);
     
    const timeOfDayBarChart = new BarchartCustomizable({ parentElement: "#timeOfDayBarChart", containerHeight: 300 }, timeOfDayFrequency, "hour");
    timeOfDayBarChart.updateVis();


    const binRanges = [
     { label: '<10sec', min: 0, max: 10 },
     { label: '10-30sec', min: 10, max: 30 },
     { label: '30-60sec', min: 30, max: 60 },
     { label: '1-2min', min: 60, max: 120 },
     { label: '2-5min', min: 120, max: 300 },
     { label: '5-10min', min: 300, max: 600 },
     { label: '10-20min', min: 600, max: 1200 },
     { label: '20-30min', min: 1200, max: 1800 },
     { label: '30-45min', min: 1800, max: 2700 },
     { label: '45-60min', min: 2700, max: 3600 },
     { label: '60min+', min: 3600 }
    ];

    function assignToBin(encounter_length) {
     for (const bin of binRanges) {
        if (encounter_length >= bin.min && (bin.max === undefined || encounter_length < bin.max)) {
          return bin.label;
        }
     }
    }

    const encounterLengthFrequency = Array.from(d3.rollup(data, v => v.length, d => assignToBin(d.encounter_length)), ([bin, frequency]) => ({bin, frequency}));
    encounterLengthFrequency.sort((a, b) => binRanges.findIndex(range => range.label === a.bin) - binRanges.findIndex(range => range.label === b.bin));

    const encounterLengthBarChart = new BarchartCustomizable({ parentElement: "#encounterLengthBarChart", containerHeight: 300 }, encounterLengthFrequency, "bin");
    encounterLengthBarChart.updateVis();
  
  })
  .catch(error => console.error(error));

  dispatcher.on('filterVisualizations', (selectedSpottings, visualization) => {
    if (selectedSpottings.length == 0){
        ResetDataFilter(true);
    }
    else {
        filteredSpottings = selectedSpottings
        const filteredLocations = filteredData.filter(d => selectedSpottings.some(coord => coord.longitude === d.longitude && coord.latitude === d.latitude));
        if (visualization !== '#timeline') {
            timeline.data = filteredLocations
            timeline.updateVis();
        }

        if (visualization !== '#monthBarChart') {
            monthBarChart.updateVis();
        }
    }
})

dispatcher.on('reset', () => {
    ResetDataFilter(true);
    timeline.updateVis();
    monthBarChart.updateVis();
})

  

