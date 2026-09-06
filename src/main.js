import Map from 'ol/Map.js';
import View from 'ol/View.js';

import MVT from 'ol/format/MVT.js';

import VectorTileLayer from 'ol/layer/VectorTile.js';
import VectorTileSource from 'ol/source/VectorTile.js';

import TileGrid from 'ol/tilegrid/TileGrid.js';

import Projection from 'ol/proj/Projection.js';
import {register} from 'ol/proj/proj4.js';

import Style from 'ol/style/Style.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Text from 'ol/style/Text.js';

import proj4 from 'proj4';
import {PMTiles} from 'pmtiles';

import './style.css';


// --------------------------------------------------
// Equal Earth / EPSG:8857
// --------------------------------------------------

proj4.defs(
  'EPSG:8857',
  '+proj=eqearth +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs',
);

register(proj4);


// Equal Earth の実際の描画範囲
const projectionExtent = [
  -17243959.06,
  -8392927.60,
   17243959.06,
   8392927.60,
];

const projection = new Projection({
  code: 'EPSG:8857',
  units: 'm',
  extent: projectionExtent,
});


// --------------------------------------------------
// PMTiles作成時と同じTileGrid
// --------------------------------------------------

const WORLD_HALF = 17243959.06;

const tileGridExtent = [
  -WORLD_HALF,
  -WORLD_HALF,
   WORLD_HALF,
   WORLD_HALF,
];

const MIN_ZOOM = 0;
const DATA_MAX_ZOOM = 5;
const VIEW_MAX_ZOOM = 10;
const TILE_SIZE = 256;

const resolutions = [];

for (let z = MIN_ZOOM; z <= VIEW_MAX_ZOOM; z++) {
  resolutions[z] =
    (WORLD_HALF * 2) /
    TILE_SIZE /
    Math.pow(2, z);
}

const tileGrid = new TileGrid({
  extent: tileGridExtent,

  // XYZの左上原点
  origin: [
    -WORLD_HALF,
     WORLD_HALF,
  ],

  tileSize: TILE_SIZE,
  resolutions,
});

const dataTileGrid = new TileGrid({
  extent: tileGridExtent,

  origin: [
    -WORLD_HALF,
     WORLD_HALF,
  ],

  tileSize: TILE_SIZE,
  resolutions: resolutions.slice(0, DATA_MAX_ZOOM + 1),
});


// --------------------------------------------------
// PMTiles
// --------------------------------------------------

const archive = new PMTiles('/countries.pmtiles');


// --------------------------------------------------
// VectorTile source
// --------------------------------------------------

const format = new MVT();

const source = new VectorTileSource({
  projection,
  tileGrid: dataTileGrid,
  format,

  minZoom: MIN_ZOOM,

  // 実際のURLではなく、
  // OpenLayers内部キャッシュ用の識別子として利用
  tileUrlFunction(tileCoord) {
    if (!tileCoord) {
      return undefined;
    }

    const [z, x, y] = tileCoord;

    return `${z}/${x}/${y}`;
  },

  tileLoadFunction(tile, url) {
    const [z, x, y] = url.split('/').map(Number);

    tile.setLoader(async (extent, resolution, projection) => {
      try {
        const response = await archive.getZxy(z, x, y);

        // PMTiles内に存在しないタイル
        if (!response) {
          tile.setFeatures([]);
          return;
        }

        const features = format.readFeatures(response.data, {
          extent,

          // MVTのローカル座標を
          // EPSG:8857のタイル範囲へ展開
          featureProjection: projection,
        });

        tile.setFeatures(features);
      } catch (error) {
        console.error(
          `Failed to load tile ${z}/${x}/${y}`,
          error,
        );

        tile.setFeatures([]);
      }
    });
  },
});


// --------------------------------------------------
// Style
// --------------------------------------------------

const countryStyle = new Style({
  zIndex: 0,

  fill: new Fill({
    color: 'rgba(230, 230, 220, 0.9)',
  }),

  stroke: new Stroke({
    color: '#444',
    width: 1,
  }),
});

const labelStyle = new Style({
  zIndex: 1,

  text: new Text({
    font: '12px sans-serif',

    fill: new Fill({
      color: '#222',
    }),

    stroke: new Stroke({
      color: '#fff',
      width: 3,
    }),
  }),
});


// --------------------------------------------------
// Layer
// --------------------------------------------------

const countriesLayer = new VectorTileLayer({
  source,

  declutter: true,

  style(feature) {
    if (feature.get('layer') !== 'country_labels') {
      return countryStyle;
    }

    const name = feature.get('name');

    labelStyle
      .getText()
      .setText(name ?? '');

    return labelStyle;
  },
});


// --------------------------------------------------
// Map
// --------------------------------------------------

function readViewFromHash() {
  const values = window.location.hash
    .slice(1)
    .split('/')
    .map(Number);

  if (values.length !== 3 || values.some((value) => !Number.isFinite(value))) {
    return null;
  }

  const [zoom, x, y] = values;

  if (
    x < projectionExtent[0] ||
    x > projectionExtent[2] ||
    y < projectionExtent[1] ||
    y > projectionExtent[3] ||
    zoom < MIN_ZOOM ||
    zoom > VIEW_MAX_ZOOM
  ) {
    return null;
  }

  return {
    center: [x, y],
    zoom,
  };
}

function formatHashNumber(value) {
  return value.toFixed(3).replace(/\.?(0+)$/, '');
}

function writeViewToHash(view) {
  const center = view.getCenter();
  const zoom = view.getZoom();

  if (!center || zoom === undefined) {
    return;
  }

  const hash = [
    formatHashNumber(zoom),
    formatHashNumber(center[0]),
    formatHashNumber(center[1]),
  ].join('/');

  window.history.replaceState(null, '', `#${hash}`);
}

const initialView = readViewFromHash();

const map = new Map({
  target: 'map',

  layers: [
    countriesLayer,
  ],

  view: new View({
    projection,

    center: initialView?.center ?? [0, 0],

    zoom: initialView?.zoom ?? 1,

    minZoom: MIN_ZOOM,
    maxZoom: VIEW_MAX_ZOOM,

    // Equal Earthの実世界範囲より外へ
    // パンし過ぎないようにする
    extent: projectionExtent,
  }),
});

map.on('moveend', () => {
  writeViewToHash(map.getView());
});

window.addEventListener('hashchange', () => {
  const nextView = readViewFromHash();

  if (!nextView) {
    return;
  }

  const view = map.getView();
  view.setCenter(nextView.center);
  view.setZoom(nextView.zoom);
});

writeViewToHash(map.getView());


// --------------------------------------------------
// Debug
// --------------------------------------------------

map.on('click', (event) => {
  map.forEachFeatureAtPixel(
    event.pixel,
    (feature) => {
      console.log({
        id: feature.getId(),
        name: feature.get('name'),
      });
    },
  );
});