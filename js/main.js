let filteredData, yearlyFrequency, monthlyFrequency, shapeFrequency, timeOfDayFrequency, selectedOption, data, orig_data;
const dispatcher = d3.dispatch('filterVisualizations', 'reset', 'resetData')
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
  { label: '5hrs+', min: 18000 }
];

d3.csv('data/ufo_sightings.csv')
  .then(data => {

    data = data.filter(d => d.latitude !== "NA" && d.longitude !== "NA" && d.ufo_shape !== "NA" && d.encounter_length > 1);
    data.forEach(d => {
      d.latitude = +d.latitude; //make sure these are not strings
      d.longitude = +d.longitude; //make sure these are not strings
      d.date_time = new Date(d.date_time)
      d.encounter_length = d.encounter_length;
      d.year = d.date_time.getFullYear();
      d.month = d.date_time.getMonth() + 1;
      d.day = d.date_time.getDate();
      d.time = d.date_time.getHours() + d.date_time.getMinutes() / 60;
      d.hour = d.date_time.getHours();
      d.minutes = d.date_time.getMinutes()
    });

    data = data.filter(d => d.year >= 1990 && d.year <= 2000);
    selectedOption = "year";
    orig_data = data;




    // Initialize chart and then show it
    leafletMap = new LeafletMap({ parentElement: '#my-map' }, data, dispatcher);


    d3.select(`#color_attr`).on('change', function () {
      selectedOption = d3.select(this).property('value');

      // Update colors based on the selected option
      leafletMap.updateColors(selectedOption);
    });
    leafletMap.updateColors(selectedOption);

    // Update all of the data for each chart
    setFrequencyData(data);

    // initialize all charts
    timeline = new TimeLine({ parentElement: '#timeline' }, yearlyFrequency, dispatcher);
    monthBarChart = new BarchartCustomizable({ parentElement: "#monthBarChart", containerHeight: 400 }, monthlyFrequency, "month", dispatcher, "Month");
    shapeBarChart = new BarchartCustomizable({ parentElement: "#shapeBarChart", containerHeight: 400 }, shapeFrequency, "shape", dispatcher, "UFO Shape");
    timeOfDayBarChart = new BarchartCustomizable({ parentElement: "#timeOfDayBarChart", containerHeight: 300 }, timeOfDayFrequency, "hour", dispatcher, "Hour");
    encounterLengthBarChart = new BarchartCustomizable({ parentElement: "#encounterLengthBarChart", containerHeight: 300 }, encounterLengthFrequency, "bin", dispatcher, "Encounter Length");

    // show the data on all charts
    updateAllCharts();

    document.getElementById('textbox').addEventListener('change', textBoxFilter);

  })
  .catch(error => console.error(error));

function getTextBoxFilter(dataset = null){
  const filterText = document.getElementById('textbox').value.trim().toLowerCase();
  let new_data;
  if (dataset){
    new_data = dataset.filter(d => d.description && d.description.toLowerCase().includes(filterText));
  }else{
    new_data = orig_data.filter(d => d.description && d.description.toLowerCase().includes(filterText));
  }
  return new_data;
}

function textBoxFilter(){
  timeline.resetBrush();
  monthBarChart.resetBrush();
  shapeBarChart.resetBrush();
  timeOfDayBarChart.resetBrush();
  encounterLengthBarChart.resetBrush();
  leafletMap.resetBrush();
  let new_data = getTextBoxFilter();
  setFrequencyData(new_data)
  updateAllCharts();
}

function ResetDataFilter() {
  setFrequencyData(orig_data,null);
  updateAllCharts();
}

dispatcher.on('filterVisualizations', (selectedSpottings, visualization) => {
  if (selectedSpottings.length == 0) {
    ResetDataFilter();
  }
  if (visualization === '#my-map'){
    timeline.resetBrush();
    monthBarChart.resetBrush();
    shapeBarChart.resetBrush();
    timeOfDayBarChart.resetBrush();
    encounterLengthBarChart.resetBrush();
    setFrequencyData(selectedSpottings, visualization);
    updateAllCharts();
  }
  if (visualization === '#timeline') {
    monthBarChart.resetBrush();
    shapeBarChart.resetBrush();
    timeOfDayBarChart.resetBrush();
    encounterLengthBarChart.resetBrush();
    leafletMap.resetBrush();
    filteredDataByYear = orig_data.filter(d => selectedSpottings.some(s => s.year === d.year));
    setFrequencyData(filteredDataByYear, visualization);
    updateAllCharts();
  }
  if (visualization === '#monthBarChart') {
    timeline.resetBrush();
    shapeBarChart.resetBrush();
    timeOfDayBarChart.resetBrush();
    encounterLengthBarChart.resetBrush();
    leafletMap.resetBrush();
    filteredDataByMonth = orig_data.filter(d => selectedSpottings.some(s => s.month === d.month));
    setFrequencyData(filteredDataByMonth, visualization);
    updateAllCharts();
  }
  if (visualization === '#shapeBarChart') {
    timeline.resetBrush();
    monthBarChart.resetBrush();
    timeOfDayBarChart.resetBrush();
    encounterLengthBarChart.resetBrush();
    leafletMap.resetBrush();
    filteredDataByShape = orig_data.filter(d => selectedSpottings.some(s => s.shape === d.ufo_shape));

    setFrequencyData(filteredDataByShape, visualization);
    updateAllCharts();
  }
  if (visualization === '#timeOfDayBarChart') {
    timeline.resetBrush();
    monthBarChart.resetBrush();
    shapeBarChart.resetBrush();
    encounterLengthBarChart.resetBrush();
    leafletMap.resetBrush();
    filteredDataByTime = orig_data.filter(d => selectedSpottings.some(s => s.hour === d.time));

    setFrequencyData(filteredDataByTime, visualization);
    updateAllCharts();
  }
  if (visualization === '#encounterLengthBarChart') {
    timeline.resetBrush();
    monthBarChart.resetBrush();
    shapeBarChart.resetBrush();
    timeOfDayBarChart.resetBrush();
    leafletMap.resetBrush();
    filteredDataByEncounterLength = orig_data.filter(d => {
      return selectedSpottings.some(s => {
        const range = getRangeFromBinLabel(s.bin);
        if (!range) return false;
        return d.encounter_length >= range.min && (range.max === undefined || d.encounter_length < range.max);
      });
    });
    setFrequencyData(filteredDataByEncounterLength, visualization);
    updateAllCharts();
  }
}
)

dispatcher.on('reset', () => {
  ResetDataFilter();
})

function setFrequencyData(new_data, chart) {
  new_data = getTextBoxFilter(new_data);
  if (chart !== "#my-map") {
    leafletMap.data = new_data;
  }
  if (chart !== "#timeline") {
    yearlyFrequency = Array.from(d3.rollup(new_data,
      v => ({
        frequency: v.length,
        description: v.map(d => d.description)
      }),
      d => d.year
    ), ([year, { frequency, description }]) => ({ year, frequency, description }));
    yearlyFrequency.sort((a, b) => a.year - b.year);
  }
  if (chart !== "#monthBarChart") {
    monthlyFrequency = Array.from(d3.rollup(new_data,
      v => ({
        frequency: v.length,
        description: v.map(d => d.description)
      }),
      d => d.month
    ), ([month, { frequency, description }]) => ({ month, frequency, description }));
    monthlyFrequency.sort((a, b) => a.month - b.month);
  }

  if (chart !== "#shapeBarChart") {
    shapeFrequency = Array.from(d3.rollup(new_data,
      v => ({
        frequency: v.length,
        description: v.map(d => d.description)
      }),
      d => d.ufo_shape
    ), ([shape, { frequency, description }]) => ({ shape, frequency, description }));
    shapeFrequency.sort((a, b) => a.shape.localeCompare(b.shape));
  }

  if (chart !== "#timeOfDayBarChart") {
    timeOfDayFrequency = Array.from(d3.rollup(new_data,
      v => ({
        frequency: v.length,
        description: v.map(d => d.description)
      }),
      d => getHourOfDay(d.date_time)
    ), ([hour, { frequency, description }]) => ({ hour, frequency, description }));
    timeOfDayFrequency.sort((a, b) => a.hour - b.hour);
  }
  if (chart !== "#encounterLengthBarChart") {
    encounterLengthFrequency = Array.from(d3.rollup(new_data,
      v => ({
        frequency: v.length,
        description: v.map(d => d.description)
      }),
      d => assignToBin(d.encounter_length)
    ), ([bin, { frequency, description }]) => ({ bin, frequency, description }));
    encounterLengthFrequency.sort((a, b) => binRanges.findIndex(range => range.label === a.bin) - binRanges.findIndex(range => range.label === b.bin));
  }
}


function updateAllCharts() {
  timeline.data = yearlyFrequency;
  monthBarChart.data = monthlyFrequency;
  shapeBarChart.data = shapeFrequency;
  timeOfDayBarChart.data = timeOfDayFrequency;
  encounterLengthBarChart.data = encounterLengthFrequency;

  leafletMap.updateVis();
  leafletMap.updateColors(selectedOption);
  timeline.updateVis()
  monthBarChart.updateVis()
  shapeBarChart.updateVis()
  timeOfDayBarChart.updateVis()
  encounterLengthBarChart.updateVis()
}

function getHourOfDay(date_time) {
  return date_time.getHours();
}

function assignToBin(encounter_length) {
  for (const bin of binRanges) {
    if (encounter_length >= bin.min && (bin.max === undefined || encounter_length < bin.max)) {
      return bin.label;
    }
  }
  return null;
}

let background = 0;
function switchBackground() {
  background = (background + 1) % 5
  leafletMap.changeBackground(background)
}
function getRangeFromBinLabel(binLabel) {
  const bin = binRanges.find(b => b.label === binLabel);
  if (!bin) return null; // Return null if no matching bin is found
  return { min: bin.min, max: bin.max };

}
function clearMapBrush(){
  leafletMap.resetBrush();
}

dispatcher.on('resetData', (visualization) => {
    // set chart data to original
    let new_data = getTextBoxFilter(orig_data);
    if (visualization === "#my-map") {
      leafletMap.data = new_data;
    } else if (visualization === "#timeline") {
      console.log("FILTERED DATA");
      console.log(filteredData)
      yearlyFrequency = Array.from(d3.rollup(new_data,
        v => ({
          frequency: v.length,
          description: v.map(d => d.description)
        }),
        d => d.year
      ), ([year, { frequency, description }]) => ({ year, frequency, description }));
      yearlyFrequency.sort((a, b) => a.year - b.year);
    } else if (visualization === "#monthBarChart") {
      monthlyFrequency = Array.from(d3.rollup(new_data,
        v => ({
          frequency: v.length,
          description: v.map(d => d.description)
        }),
        d => d.month
      ), ([month, { frequency, description }]) => ({ month, frequency, description }));
      monthlyFrequency.sort((a, b) => a.month - b.month);
    } else if (visualization === "#shapeBarChart") {
      shapeFrequency = Array.from(d3.rollup(new_data,
        v => ({
          frequency: v.length,
          description: v.map(d => d.description)
        }),
        d => d.ufo_shape
      ), ([shape, { frequency, description }]) => ({ shape, frequency, description }));
      shapeFrequency.sort((a, b) => a.shape.localeCompare(b.shape));
    } else if (visualization === "#timeOfDayBarChart") {
      timeOfDayFrequency = Array.from(d3.rollup(new_data,
        v => ({
          frequency: v.length,
          description: v.map(d => d.description)
        }),
        d => getHourOfDay(d.date_time)
      ), ([hour, { frequency, description }]) => ({ hour, frequency, description }));
      timeOfDayFrequency.sort((a, b) => a.hour - b.hour);
    } else if (visualization === "#encounterLengthBarChart") {
      encounterLengthFrequency = Array.from(d3.rollup(new_data,
        v => ({
          frequency: v.length,
          description: v.map(d => d.description)
        }),
        d => assignToBin(d.encounter_length)
      ), ([bin, { frequency, description }]) => ({ bin, frequency, description }));
      encounterLengthFrequency.sort((a, b) => binRanges.findIndex(range => range.label === a.bin) - binRanges.findIndex(range => range.label === b.bin));
    }
    updateAllCharts();


})