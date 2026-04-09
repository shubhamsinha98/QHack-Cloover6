const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 420;
const DEFAULT_PADDING = 18;
const TILE_SIZE = 256;
const MIN_ZOOM = 16;
const MAX_ZOOM = 19;

export const ROOF_PITCH_OPTIONS = [
  { value: "Flat", multiplier: 1 },
  { value: "Slightly pitched", multiplier: 1.08 },
  { value: "Steep pitch", multiplier: 1.18 },
];

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function closeRing(points) {
  if (!Array.isArray(points) || points.length < 3) {
    return [];
  }

  const normalized = points.map((point) => ({
    lat: toNumber(point.lat),
    lng: toNumber(point.lon ?? point.lng),
  }));

  const first = normalized[0];
  const last = normalized[normalized.length - 1];

  if (first.lat !== last.lat || first.lng !== last.lng) {
    normalized.push({ ...first });
  }

  return normalized;
}

export function calculatePolygonAreaM2(points) {
  const ring = closeRing(points);

  if (ring.length < 4) {
    return 0;
  }

  const lat0 =
    ring.slice(0, -1).reduce((sum, point) => sum + point.lat, 0) / (ring.length - 1);
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((lat0 * Math.PI) / 180);

  const projected = ring.map((point) => ({
    x: point.lng * metersPerDegLng,
    y: point.lat * metersPerDegLat,
  }));

  let area = 0;
  for (let index = 0; index < projected.length - 1; index += 1) {
    const current = projected[index];
    const next = projected[index + 1];
    area += current.x * next.y - next.x * current.y;
  }

  return Math.abs(area) / 2;
}

function calculateCentroid(points) {
  const ring = closeRing(points);

  if (ring.length < 4) {
    return { lat: 0, lng: 0 };
  }

  const body = ring.slice(0, -1);
  return {
    lat: body.reduce((sum, point) => sum + point.lat, 0) / body.length,
    lng: body.reduce((sum, point) => sum + point.lng, 0) / body.length,
  };
}

function distanceMeters(pointA, pointB) {
  const latFactor = 111320;
  const lngFactor = 111320 * Math.cos((((pointA.lat + pointB.lat) / 2) * Math.PI) / 180);
  const dx = (pointA.lng - pointB.lng) * lngFactor;
  const dy = (pointA.lat - pointB.lat) * latFactor;
  return Math.sqrt(dx * dx + dy * dy);
}

function formatBuildingLabel(tags, fallbackIndex) {
  if (!tags) {
    return `Building ${fallbackIndex + 1}`;
  }

  const parts = [
    tags.name,
    [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ").trim(),
  ].filter(Boolean);

  return parts[0] || `Building ${fallbackIndex + 1}`;
}

export async function searchAddress(query) {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "de");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("polygon_geojson", "1");
  url.searchParams.set("q", query);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("OpenStreetMap address lookup failed.");
  }

  const results = await response.json();
  const match = results[0];

  if (!match) {
    throw new Error("No address match found in OpenStreetMap.");
  }

  return {
    displayName: match.display_name,
    lat: Number(match.lat),
    lng: Number(match.lon),
    geojson: match.geojson || null,
    osmType: match.osm_type || "",
    type: match.type || "",
    category: match.category || "",
  };
}

function extractPolygonFromGeoJson(geojson) {
  if (!geojson) {
    return [];
  }

  if (geojson.type === "Polygon") {
    return closeRing((geojson.coordinates?.[0] || []).map(([lng, lat]) => ({ lat, lng })));
  }

  if (geojson.type === "MultiPolygon") {
    const rings = geojson.coordinates || [];
    const largest = rings
      .map((polygon) => closeRing((polygon?.[0] || []).map(([lng, lat]) => ({ lat, lng }))))
      .sort((left, right) => calculatePolygonAreaM2(right) - calculatePolygonAreaM2(left))[0];

    return largest || [];
  }

  return [];
}

export function getDirectAddressBuilding(match) {
  const polygon = extractPolygonFromGeoJson(match?.geojson);

  if (polygon.length < 4) {
    return null;
  }

  const areaM2 = calculatePolygonAreaM2(polygon);

  if (areaM2 <= 15) {
    return null;
  }

  return {
    id: `direct-${match.osmType || "place"}-${match.lat}-${match.lng}`,
    label: "Address-matched building",
    polygon,
    centroid: calculateCentroid(polygon),
    areaM2,
    distanceMeters: 0,
  };
}

export async function fetchNearbyBuildings(lat, lng, directMatch = null) {
  const target = { lat: Number(lat), lng: Number(lng) };
  const radii = [120, 250, 450, 700];
  let bestMatches = directMatch ? [directMatch] : [];

  for (const radius of radii) {
    const query = `
[out:json][timeout:25];
(
  way["building"](around:${radius},${lat},${lng});
  relation["building"](around:${radius},${lat},${lng});
  way["building:part"](around:${radius},${lat},${lng});
  relation["building:part"](around:${radius},${lat},${lng});
);
out geom tags center;
    `.trim();

    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body: query,
    });

    if (!response.ok) {
      continue;
    }

    const payload = await response.json();
    const matches = [
      ...bestMatches,
      ...(payload.elements || [])
      .map((element, index) => {
        const polygon = closeRing(element.geometry || []);
        const centroid = calculateCentroid(polygon);
        const areaM2 = calculatePolygonAreaM2(polygon);

        return {
          id: `${element.type}-${element.id}`,
          label: formatBuildingLabel(element.tags, index),
          polygon,
          centroid,
          areaM2,
          distanceMeters: distanceMeters(centroid, target),
        };
      })
      .filter((item) => item.polygon.length >= 4 && item.areaM2 > 15)
    ]
      .filter(
        (item, index, items) =>
          items.findIndex((candidate) => candidate.id === item.id) === index,
      )
      .sort((left, right) => left.distanceMeters - right.distanceMeters || right.areaM2 - left.areaM2);

    if (matches.length) {
      bestMatches = matches.slice(0, 10);
      if (bestMatches.length >= 3 || directMatch) {
        break;
      }
    }
  }

  return bestMatches;
}

export function getRoofMetrics(selection) {
  const footprintAreaM2 = Math.round(toNumber(selection?.roofFootprintAreaM2));
  const pitchMultiplier = getRoofPitchMultiplier(selection?.roofType);
  const surfaceAreaM2 = Math.round(
    toNumber(selection?.roofSurfaceAreaM2) || footprintAreaM2 * pitchMultiplier,
  );
  const usablePct = Math.min(Math.max(toNumber(selection?.usableRoofPct) || 75, 0), 100);
  const usableRoofAreaM2 = Math.round(surfaceAreaM2 * (usablePct / 100));

  return {
    footprintAreaM2,
    pitchMultiplier,
    surfaceAreaM2,
    usablePct,
    usableRoofAreaM2,
  };
}

export function getSolarSizingMetrics(selection) {
  const roofMetrics = getRoofMetrics(selection);
  const panelAreaM2 = 1.95;
  const panelPowerKw = 0.45;
  const layoutEfficiency = 0.9;
  const effectivePanelAreaM2 = roofMetrics.usableRoofAreaM2 * layoutEfficiency;
  const panelCount = Math.max(Math.floor(effectivePanelAreaM2 / panelAreaM2), 0);
  const systemSizeKw = Number((panelCount * panelPowerKw).toFixed(2));

  return {
    ...roofMetrics,
    panelAreaM2,
    panelPowerKw,
    layoutEfficiency,
    effectivePanelAreaM2: Math.round(effectivePanelAreaM2),
    panelCount,
    systemSizeKw,
  };
}

export function getRoofPitchMultiplier(roofType) {
  const normalized = String(roofType || "").toLowerCase();

  if (normalized.includes("steep")) {
    return 1.18;
  }
  if (normalized.includes("slight")) {
    return 1.08;
  }

  return 1;
}

export function createMapViewport(points, focusPoint) {
  const allPoints = Array.isArray(points) ? points.filter(Boolean) : [];

  if (!allPoints.length && !focusPoint) {
    return null;
  }

  const lngValues = allPoints.map((point) => point.lng);
  const latValues = allPoints.map((point) => point.lat);
  if (focusPoint) {
    lngValues.push(focusPoint.lng - 0.00025, focusPoint.lng + 0.00025);
    latValues.push(focusPoint.lat - 0.00025, focusPoint.lat + 0.00025);
  }

  const minLng = Math.min(...lngValues);
  const maxLng = Math.max(...lngValues);
  const minLat = Math.min(...latValues);
  const maxLat = Math.max(...latValues);
  const width = DEFAULT_WIDTH;
  const height = DEFAULT_HEIGHT;
  const center = {
    lng: (minLng + maxLng) / 2,
    lat: (minLat + maxLat) / 2,
  };

  function lngLatToWorldPixel(point, zoom) {
    const scale = TILE_SIZE * 2 ** zoom;
    const sinLat = Math.sin((point.lat * Math.PI) / 180);
    return {
      x: ((point.lng + 180) / 360) * scale,
      y:
        (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
    };
  }

  function worldPixelToLngLat(point, zoom) {
    const scale = TILE_SIZE * 2 ** zoom;
    const lng = (point.x / scale) * 360 - 180;
    const y = 0.5 - point.y / scale;
    const lat = (90 - (360 * Math.atan(Math.exp(-y * 2 * Math.PI))) / Math.PI);
    return { lat, lng };
  }

  function chooseZoom() {
    for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
      const pixels = allPoints.map((point) => lngLatToWorldPixel(point, zoom));
      const pxMinX = Math.min(...pixels.map((point) => point.x));
      const pxMaxX = Math.max(...pixels.map((point) => point.x));
      const pxMinY = Math.min(...pixels.map((point) => point.y));
      const pxMaxY = Math.max(...pixels.map((point) => point.y));

      if (
        pxMaxX - pxMinX <= width - DEFAULT_PADDING * 2 &&
        pxMaxY - pxMinY <= height - DEFAULT_PADDING * 2
      ) {
        return zoom;
      }
    }

    return MIN_ZOOM;
  }

  const zoom = chooseZoom();
  const centerWorldPixel = lngLatToWorldPixel(center, zoom);
  const topLeftWorldPixel = {
    x: centerWorldPixel.x - width / 2,
    y: centerWorldPixel.y - height / 2,
  };
  const bottomRightWorldPixel = {
    x: centerWorldPixel.x + width / 2,
    y: centerWorldPixel.y + height / 2,
  };

  function project(point) {
    const worldPixel = lngLatToWorldPixel(point, zoom);
    return {
      x: worldPixel.x - topLeftWorldPixel.x,
      y: worldPixel.y - topLeftWorldPixel.y,
    };
  }

  function unproject(x, y) {
    return worldPixelToLngLat(
      {
        x: topLeftWorldPixel.x + x,
        y: topLeftWorldPixel.y + y,
      },
      zoom,
    );
  }

  const tileMinX = Math.floor(topLeftWorldPixel.x / TILE_SIZE);
  const tileMaxX = Math.floor(bottomRightWorldPixel.x / TILE_SIZE);
  const tileMinY = Math.floor(topLeftWorldPixel.y / TILE_SIZE);
  const tileMaxY = Math.floor(bottomRightWorldPixel.y / TILE_SIZE);
  const maxTileIndex = 2 ** zoom;

  const tiles = [];
  for (let tileX = tileMinX; tileX <= tileMaxX; tileX += 1) {
    for (let tileY = tileMinY; tileY <= tileMaxY; tileY += 1) {
      if (tileY < 0 || tileY >= maxTileIndex) {
        continue;
      }

      const wrappedTileX = ((tileX % maxTileIndex) + maxTileIndex) % maxTileIndex;
      tiles.push({
        key: `${zoom}-${wrappedTileX}-${tileY}`,
        href: `https://tile.openstreetmap.org/${zoom}/${wrappedTileX}/${tileY}.png`,
        x: tileX * TILE_SIZE - topLeftWorldPixel.x,
        y: tileY * TILE_SIZE - topLeftWorldPixel.y,
        width: TILE_SIZE,
        height: TILE_SIZE,
      });
    }
  }

  return {
    width,
    height,
    zoom,
    project,
    unproject,
    tiles,
  };
}

export function getPolygonViewModel(buildings, selectedId, focusPoint, manualPolygon = []) {
  const allPoints = [
    ...buildings.flatMap((building) => building.polygon || []),
    ...(manualPolygon || []),
  ];
  const viewport = createMapViewport(allPoints, focusPoint);

  if (!viewport) {
    return { polygons: [], marker: null, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }

  const { width, height, project, unproject, tiles, zoom } = viewport;

  return {
    width,
    height,
    zoom,
    tiles,
    polygons: buildings.map((building) => ({
      id: building.id,
      selected: building.id === selectedId,
      path: (building.polygon || [])
        .map((point) => {
          const projected = project(point);
          return `${projected.x},${projected.y}`;
        })
        .join(" "),
      label: building.label,
      areaM2: building.areaM2,
    })),
    manualPolygon: (manualPolygon || []).map((point) => {
      const projected = project(point);
      return `${projected.x},${projected.y}`;
    }),
    manualPoints: (manualPolygon || []).map((point) => project(point)),
    marker: focusPoint
      ? project(focusPoint)
      : null,
    unproject,
  };
}
