const API = 'https://dadosabertos.rio.rj.gov.br/apiTransporte/apresentacao/rest/index.cfm/onibus'
const HARDCODED_API = 'sample.json'
const LOCAL_STORAGE_KEYS = {
    DATA: 'DATA',
    LAST_READ_TIMESTAMP: 'LAST_READ_TIMESTAMP'
}
const MINUTE = 60000
const INITIAL_LAT_LON = [-22.9145, -43.4477]
const INITIAL_ZOOM = 11
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

const $busList = document.querySelector('#buslist')

let map
let data
let busLines = []
let busesLayerGroup

const addMarker = busData => {
    // bus is an array like: ['06-18-2022 07:20:25', 'D13312', 'SV790', -22.88001, -43.35811, 0, 148]
    const date = busData[0]
    const carNumber = busData[1]
    const lineNumber = busData[2]
    const lat = busData[3]
    const lon = busData[4]
    // const direction = busData[5]

    const popupText = `${lineNumber} - ${carNumber} - ${date}`
    console.log(`Adding marker`, popupText)

    L.marker([lat, lon])
        .bindPopup(popupText)
        .addTo(busesLayerGroup)
}

const populateSelect = () => {
    busLines = [...new Set(data.DATA.map(b => b[2]))]
    busLines.sort()
    busLines.forEach(bus => {
        if (bus === '') return null
        let option = document.createElement('option')
        option.value = bus
        option.text = bus
        $busList.appendChild(option)
    })
}

const processData = newData => {
    data = newData
    console.log(data)
    populateSelect()
}

const storeData = data => {
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_READ_TIMESTAMP, Date.now())
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.DATA, JSON.stringify(data))
    return data
}

const loadRemoteData = () => {
    fetch(API)
        .then(response => response.json())
        .then(data => storeData(data))
        .then(data => processData(data))
}

const loadLocalData = () => {
    const lastReadTimestampString = window.localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_READ_TIMESTAMP)
    if (lastReadTimestampString === null) {
        console.log(`No data on localStorage, loading from server`)
        return loadRemoteData()
    }
    const lastReadTimestamp = parseInt(lastReadTimestampString, 10)
    const currentTimestamp = Date.now()
    if (currentTimestamp - lastReadTimestamp > MINUTE) {
        console.log(`Data too old, loading from server`)
        return loadRemoteData()
    }
    const dataString = window.localStorage.getItem(LOCAL_STORAGE_KEYS.DATA)
    if (dataString === null) {
        console.log(`Valid timestamp but invalid data, loading from server`)
        return loadRemoteData()
    }
    console.log(`Valid data, loading locally`)
    const data = JSON.parse(dataString)
    processData(data)
}

const initMap = () => {
    map = L.map('map').setView(INITIAL_LAT_LON, INITIAL_ZOOM);

    L.tileLayer(OSM_TILE_URL, {
        maxZoom: 19,
        attribution: '© Dados: Data Rio / Mapa: OpenStreetMap'
    }).addTo(map);
}

const onBusListSelected = event => {
    const selectedLine = event.target.value
    const filteredVehicles = data.DATA.filter(b => b[2].toString() === selectedLine)
    // always reset the layer group, so the pins change
    if (busesLayerGroup) {
        map.removeLayer(busesLayerGroup)
    }
    busesLayerGroup = L.layerGroup().addTo(map)
    filteredVehicles.forEach(d => addMarker(d))
    console.log('Selected', selectedLine, filteredVehicles)
}

const initEvents = () => {
    $busList.addEventListener('change', onBusListSelected)
}

const init = () => {
    initMap()
    loadLocalData()
    initEvents()
}

init()
