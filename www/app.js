// JavaScript code for the BLE Scan example app.
// The code is inside a closure to avoid polluting the global scope.
;(function(){

// Dictionary of found devices.
var devices = {}
var routes = {}

// Timer that updates the displayed list of devices.
var updateTimer = null

function main(){
  $(function(){
    // When document has loaded we attach FastClick to
    // eliminate the 300 ms delay on click events.
    FastClick.attach(document.body)

    // Event listener for Back button.
    $('.app-back').on('click', function() { history.back() })
  })
  // Event handler called when Cordova plugins have loaded.
  document.addEventListener(
    'deviceready',
    onDeviceReady,
    false)
}

function onDeviceReady(){
  // Un-gray buttons.
  $('button.app-start-scan')
    .removeClass('mdl-button--disabled')
    .addClass('mdl-color--green-A700')
  $('button.app-stop-scan')
    .removeClass('mdl-button--disabled')
    .addClass('mdl-color--deep-orange-900')
  $('button.app-clear-scan')
    .removeClass('mdl-button--disabled')
    .addClass('mdl-color--amber-200')
  $('button.app-get-route-description')
    .removeClass('mdl-button--disabled')
    .addClass('mdl-color--yellow-800')

  // Attach event listeners.
  $('.app-start-scan').on('click', startScan)
  $('.app-stop-scan').on('click', stopScan)
  $('.app-clear-scan').on('click', clearScan)
  $('.app-get-route-description').on('click', get_route_description)
}

function startScan(){
  // Make sure scan is stopped.
  stopScan()
  // Start scan.
  evothings.ble.startScan(
    function(device)    {
      // Device found. Sometimes an RSSI of +127 is reported.
      // We filter out these values here.
      if (device.rssi <= 0) {
        // Set timeStamp.
        device.timeStamp = Date.now()
        // Store device in table of found devices.
        devices[device.address] = device
      }
    },
    function(error)    {
      showMessage('Scan error: ' + error)
      stopScan()
    }
  )
  // Start update timer.
  updateTimer = setInterval(updateDeviceList, 500)
  // Update UI.
  $('.mdl-progress').addClass('mdl-progress__indeterminate')
  showMessage('Scan started')
}

function stopScan(){
  // Stop scan.
  evothings.ble.stopScan()
  // Clear devices.
  devices = {}
  // Stop update timer.
  if (updateTimer)  {
    clearInterval(updateTimer)
    updateTimer = null
  }
  // Update UI.
  $('.mdl-progress').removeClass('mdl-progress__indeterminate')
}
function clearScan(){
  // Update UI.
  $('.mdl-progress').removeClass('mdl-progress__indeterminate')
  $('.app-cards').empty()
  hideDrawerIfVisible()
}

function get_route_description(){
  $('.mdl-progress').addClass('mdl-progress__indeterminate')
  const url_test = "https://serene-shenandoah-25913.herokuapp.com/el_camino";
  data_test = {"command" : "get_route_description", "number" : 0};
  var data_res = {"error":"SERVER_UNAVAILABLE"};
  $.ajax({
    type: 'POST',
    timeout: 30000,
    url: url_test,
    data: JSON.stringify(data_test),
    success: function(data,status){
      showMessage('data sended'+data)
      data_res = JSON.parse(data);
      routes[data_res.uniq_name] = data_res;
      create_route(data_res);
    },
    error: function(data,status) { showMessage('route get error')}
  });                                                                                     

  $('.mdl-progress').removeClass('mdl-progress__indeterminate')
}


function hideDrawerIfVisible(){
  if ($('.mdl-layout__drawer').hasClass('mdl-layout__drawer is-visible'))  {
    document.querySelector('.mdl-layout').MaterialLayout.toggleDrawer()
  }
}

function showMessage(message){
  document.querySelector('.mdl-snackbar').MaterialSnackbar.showSnackbar(
    {    message: message  }
  )
}

function updateDeviceList(){
  var timeNow = Date.now();
  $.each(devices, function(key, device)  {
    // Only show devices that have been updated during the last 10 seconds.
    if (device.timeStamp + 10000 > timeNow)    {
       displayDevice(device)
    }    else    {
      // Remove inactive device.
      removeDevice(device)
    }
  })
}

function displayDevice(device){
  if (!deviceIsDisplayed(device))  {
    createDevice(device)
  }
  updateDevice(device)
}

function deviceIsDisplayed(device){
  var deviceId = '#' + getDeviceDomId(device)
  return !!($(deviceId).length)
}

function updateDevice(device){
  // Map the RSSI value to a width in percent for the indicator.
  var distanceBarValue = 100; // Used when RSSI is zero or greater.
  if (device.rssi < -100) { distanceBarValue = 1; 
  } else if (device.rssi < 0) { distanceBarValue = 100 + device.rssi; 
  } else {distanceBarValue = 100;}
  var deviceId = '#' + getDeviceDomId(device)
  $(deviceId + ' .device-rssi').text(device.rssi)
  $(deviceId + ' .device-distance-bar').css('width', distanceBarValue + 'px')
  if (!device.advertisementData) return
  $(deviceId + ' .device-kCBAdvDataLocalName')
    .text(device.advertisementData.kCBAdvDataLocalName)
  $(deviceId + ' .device-kCBAdvDataTxPowerLevel')
    .text(device.advertisementData.kCBAdvDataTxPowerLevel)
  $(deviceId + ' .device-kCBAdvDataIsConnectable')
    .text(device.advertisementData.kCBAdvDataIsConnectable)
  $(deviceId + ' .device-kCBAdvDataServiceUUIDs')
    .text(JSON.stringify(device.advertisementData.kCBAdvDataServiceUUIDs))
  $(deviceId + ' .device-kCBAdvDataServiceData')
    .text(JSON.stringify(device.advertisementData.kCBAdvDataServiceData))
}

function createDevice(device){
  // Create HTML element to display device data.
  var domId = getDeviceDomId(device);
  var element = $(
    '<div id="' + domId + '" class="mdl-card mdl-card--border mdl-shadow--2dp">'
    +  '<div class="mdl-card__title">'
    +    '<h2 class="mdl-card__title-text">Device: ' + device.name + '</h2>'
    +  '</div>'
    +  '<div class="mdl-card__supporting-text">'
    +    'RSSI: <span class="device-rssi"></span><br>'
    +    'name: <span class="device-kCBAdvDataLocalName"></span><br>'
    +    'UUID: <span class="device-kCBAdvDataServiceUUIDs"></span><br>'
    +    'ServiceData: <span class="device-kCBAdvDataServiceData"></span><br>'
    +    'TxPowerLevel: <span class="device-kCBAdvDataTxPowerLevel"></span><br>'
    +    'Connectable: <span class="device-kCBAdvDataIsConnectable"></span><br>'
    +     '<div class="device-distance-bar" style="width:0px;height:10px;margin-top:20px;background:rgb(200,200,0)"></div>'
    +  '</div>'
    + '</div>')
  // Add element.
  $('.app-cards').append(element)
}

function create_route(route){
  // Create HTML element to display device data.
  var domId = get_route_dom_id(route);
  var element = $(
    '<div id="' + domId + '" class="mdl-card mdl-card--border mdl-shadow--2dp">'
    +  '<div class="mdl-card__title">'
    +    '<h2 class="mdl-card__title-text">Device: ' + route.uniq_name + '</h2>'
    +  '</div>'
    +  '<div class="mdl-card__supporting-text">'
    +    'start_pos: <span>'+route.gps_coordinate_of_start+'</span><br>'
    +    'points_number: <span>'+route.points_numbe+'</span><br>'
    +    'lentgh_km: <span>'+route.lentgh_km+'</span><br>'
    +    'description: <span>'+route.description+'</span><br>'
    +  '</div>'
    + '</div>')
  // Add element.
  $('.app-cards').append(element)
}
function remove_route(route){
  // Remove from UI.
  var deviceId = '#' + get_route_dom_id(route)
  $(deviceId).remove()
  // Delete from model.
  delete routes[route.uniq_name]
}


function removeDevice(device){
  // Remove from UI.
  var deviceId = '#' + getDeviceDomId(device)
  $(deviceId).remove()
  // Delete from model.
  delete devices[devices.address]
}

function getDeviceDomId(device){
  return 'device-dom-id-' + device.address.replace(/:/g, "_")
}
function get_route_dom_id(route){
  return 'route-dom-id-' + route.uniq_name
}

main()

})();
