let filteredData, yearlyFrequency, monthlyFrequency, shapeFrequency, timeOfDayFrequency, selectedOption;
const dispatcher = d3.dispatch('filterVisualizations', 'reset')
const binRanges = [
  { label: '0-5sec', min: 0, max: 5 },
  { label: '5-10sec', min: 5, max: 10 },
  { label: '10-30sec', min: 10, max: 30 },
  { label: '30-60sec', min: 30, max: 60 },
  { label: '1-2min', min: 60, max: 120 },
  { label: '2-5min', min: 120, max: 300 },
  { label: '5-10min', min: 300, max: 600 },
  { label: '10-20min', min: 600, max: 1200 },
  { label: '20-30min', min: 1200, max: 1800 },
  { label: '30-45min', min: 1800, max: 2700 },
  { label: '45-60min', min: 2700, max: 3600 },
  { label: '1-2hrs', min: 3600, max: 7200 },
  { label: '2-3hrs', min: 7200, max: 10800 },
  { label: '3-5hrs', min: 10800, max: 18000 },
  { label: '5hrs+', min: 18000}
 ];

d3.csv('data/ufo_sightings.csv')
.then(data => {

    data = data.filter(d => d.latitude !== "NA" && d.longitude !== "NA" && d.ufo_shape !== "NA");
    data.forEach(d => {
      d.latitude = +d.latitude; //make sure these are not strings
      d.longitude = +d.longitude; //make sure these are not strings
      d.date_time = new Date(d.date_time)
      d.encounter_length = d.encounter_length;
      d.year = d.date_time.getFullYear();
      d.month = d.date_time.getMonth() + 1;
      d.time = d.date_time.getHours() + d.date_time.getMinutes()/60;
    });

    data = data.filter(d=>d.year>2000);
    data = data.filter(d=>d.encounter_length>1);
    selectedOption = "year";

    filteredData = data;

    yearlyFrequency = Array.from(d3.rollup(data, v => v.length, d => d.year), ([year, frequency]) => ({year, frequency}));
    yearlyFrequency.sort((a, b) => a.year - b.year);
    // Initialize chart and then show it
    leafletMap = new LeafletMap({ parentElement: '#my-map'}, data);

    // Initialize chart and then show it
    timeline = new TimeLine({ parentElement: '#timeline'}, yearlyFrequency);

    d3.select(`#color_attr`).on('change', function() {
      selectedOption = d3.select(this).property('value');
      
      // Update colors based on the selected option
      leafletMap.updateColors(selectedOption);
    });
    leafletMap.updateColors(selectedOption);
    timeline.updateVis();

    monthlyFrequency = Array.from(d3.rollup(data, v => v.length, d => d.month), ([month, frequency]) => ({month, frequency}));
    monthlyFrequency.sort((a, b) => a.month - b.month);

    monthBarChart = new BarchartCustomizable({ parentElement: "#monthBarChart", containerHeight: 400}, monthlyFrequency, "month", dispatcher);
    monthBarChart.updateVis();

    shapeFrequency = Array.from(d3.rollup(data, v => v.length, d => d.ufo_shape), ([shape, frequency]) => ({shape, frequency}));
    shapeFrequency.sort((a, b) => a.shape.localeCompare(b.shape));

    shapeBarChart = new BarchartCustomizable({ parentElement: "#shapeBarChart", containerHeight: 400}, shapeFrequency, "shape", dispatcher);
    shapeBarChart.updateVis();

    function getHourOfDay(date_time) {
      return date_time.getHours();
     }
     
    timeOfDayFrequency = Array.from(d3.rollup(data, v => v.length, d => getHourOfDay(d.date_time)), ([hour, frequency]) => ({hour, frequency}));
    timeOfDayFrequency.sort((a, b) => a.hour - b.hour);
     
    timeOfDayBarChart = new BarchartCustomizable({ parentElement: "#timeOfDayBarChart", containerHeight: 300 }, timeOfDayFrequency, "hour", dispatcher);
    timeOfDayBarChart.updateVis();


    

    function assignToBin(encounter_length) {
     for (const bin of binRanges) {
        if (encounter_length >= bin.min && (bin.max === undefined || encounter_length < bin.max)) {
          return bin.label;
        }
     }
     return null;
    }

    encounterLengthFrequency = Array.from(d3.rollup(data, v => v.length, d => assignToBin(d.encounter_length)), ([bin, frequency]) => ({bin, frequency}));
    encounterLengthFrequency.sort((a, b) => binRanges.findIndex(range => range.label === a.bin) - binRanges.findIndex(range => range.label === b.bin));

    encounterLengthBarChart = new BarchartCustomizable({ parentElement: "#encounterLengthBarChart", containerHeight: 300 }, encounterLengthFrequency, "bin", dispatcher);
    encounterLengthBarChart.updateVis();
  
  })
  .catch(error => console.error(error));

  function ResetDataFilter() {
    monthBarChart.data = monthlyFrequency;
    monthBarChart.updateVis();
    shapeBarChart.data = shapeFrequency;
    shapeBarChart.updateVis();
    timeOfDayBarChart.data = timeOfDayFrequency;
    timeOfDayBarChart.updateVis();
    timeline.data = yearlyFrequency;
    timeline.updateVis();
  }
  
  dispatcher.on('filterVisualizations', (selectedSpottings, visualization) => {
    if (selectedSpottings.length == 0){
        ResetDataFilter();
    }
    else {
      console.log(selectedSpottings);
        if (visualization === '#monthBarChart') {
            filteredDataByMonth = filteredData.filter(d => selectedSpottings.some(s => s.month === d.month));
            console.log(filteredDataByMonth);
            timeline.data = Array.from(d3.rollup(filteredDataByMonth, v => v.length, d => d.year), ([year, frequency]) => ({year, frequency})).sort((a, b) => a.year - b.year);
            timeline.updateVis();
            leafletMap.data = filteredDataByMonth;
            leafletMap.updateVis();
            leafletMap.updateColors(selectedOption);
        }
        if (visualization === '#shapeBarChart') {
          filteredDataByShape = filteredData.filter(d => selectedSpottings.some(s => s.shape === d.ufo_shape));
          console.log(filteredDataByShape);
          timeline.data = Array.from(d3.rollup(filteredDataByShape, v => v.length, d => d.year), ([year, frequency]) => ({year, frequency})).sort((a, b) => a.year - b.year);
          timeline.updateVis();
          leafletMap.data = filteredDataByShape;
          leafletMap.updateVis();
          leafletMap.updateColors(selectedOption);
        }
        if (visualization === '#timeOfDayBarChart') {
          filteredDataByTime = filteredData.filter(d => selectedSpottings.some(s => s.hour === d.time));
          console.log(filteredDataByTime);
          timeline.data = Array.from(d3.rollup(filteredDataByTime, v => v.length, d => d.year), ([year, frequency]) => ({year, frequency})).sort((a, b) => a.year - b.year);
          timeline.updateVis();
          leafletMap.data = filteredDataByTime;
          leafletMap.updateVis();
          leafletMap.updateColors(selectedOption);
        }

        function getRangeFromBinLabel(binLabel) {
          const bin = binRanges.find(b => b.label === binLabel);
          if (!bin) return null; // Return null if no matching bin is found
      
          return { min: bin.min, max: bin.max };
      }

        if (visualization === '#encounterLengthBarChart') {
            filteredDataByEncounterLength = filteredData.filter(d => {
                return selectedSpottings.some(s => {
                    const range = getRangeFromBinLabel(s.bin);
                    if (!range) return false;
                    return d.encounter_length >= range.min && (range.max === undefined || d.encounter_length < range.max);
                });
            });
            console.log(filteredDataByEncounterLength);
            filteredDataByEncounterLength = Array.from(d3.rollup(filteredDataByEncounterLength, v => v.length, d => d.year), ([year, frequency]) => ({year, frequency})).sort((a, b) => a.year - b.year);
            timeline.data = filteredDataByEncounterLength;
            timeline.updateVis();
        }
    }
})

dispatcher.on('reset', () => {
    ResetDataFilter();
    timeline.updateVis();
    monthBarChart.updateVis();
})

  

