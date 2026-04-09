import { useEffect, useMemo, useState } from "react";
import {
  calculatePolygonAreaM2,
  getPolygonViewModel,
  getRoofMetrics,
  getRoofPitchMultiplier,
  ROOF_PITCH_OPTIONS,
  searchAddress,
} from "../lib/osmRoofTools";

function formatArea(value) {
  return `${new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 0,
  }).format(Math.round(value || 0))} m2`;
}

function SmallMetric({ label, value, note }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-slate-900">{value}</div>
      {note ? <div className="mt-1 text-xs leading-5 text-slate-500">{note}</div> : null}
    </div>
  );
}

export default function OsmBuildingPicker({
  value,
  onChange,
  title = "Roof footprint",
  description = "Search the address, center the map, then draw the roof outline manually to calculate area.",
}) {
  const [query, setQuery] = useState(value.address || value.roofSearchQuery || "");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [searchResult, setSearchResult] = useState(
    value.roofSearchResult
      ? {
          displayName: value.roofSearchResult,
          lat: Number(value.roofSearchLat),
          lng: Number(value.roofSearchLng),
        }
      : null,
  );
  const manualPolygon = Array.isArray(value.roofPolygon) ? value.roofPolygon : [];

  useEffect(() => {
    setQuery(value.address || value.roofSearchQuery || "");
  }, [value.address, value.roofSearchQuery]);

  async function handleSearch() {
    const nextQuery = query.trim();

    if (!nextQuery) {
      setError("Enter the customer address first.");
      return;
    }

    setSearching(true);
    setError("");

    try {
      const match = await searchAddress(nextQuery);

      setSearchResult(match);
      setError("");
      onChange({
        ...value,
        address: value.address || nextQuery,
        roofSearchQuery: nextQuery,
        roofSearchResult: match.displayName,
        roofSearchLat: match.lat,
        roofSearchLng: match.lng,
        roofSelectionMode: "manual",
      });
    } catch (searchError) {
      setSearchResult(null);
      setError(
        "Address lookup is unavailable right now. You can still type the address and draw manually once the map is centered.",
      );
    } finally {
      setSearching(false);
    }
  }

  function handleUsableChange(event) {
    const usableRoofPct = Math.min(Math.max(Number(event.target.value) || 0, 0), 100);
    const surfaceAreaM2 = Number(value.roofSurfaceAreaM2) || 0;

    onChange({
      ...value,
      usableRoofPct,
      usableRoofAreaM2: Math.round(surfaceAreaM2 * (usableRoofPct / 100)),
    });
  }

  function handleRoofTypeChange(event) {
    const roofType = event.target.value;
    const footprintAreaM2 =
      Number(value.roofFootprintAreaM2) ||
      Number(value.roofSurfaceAreaM2) / getRoofPitchMultiplier(value.roofType);
    const pitchMultiplier = getRoofPitchMultiplier(roofType);
    const roofSurfaceAreaM2 = Math.round(footprintAreaM2 * pitchMultiplier);
    const usableRoofPct = Number(value.usableRoofPct) || 75;

    onChange({
      ...value,
      roofType,
      roofFootprintAreaM2: Math.round(footprintAreaM2),
      roofSurfaceAreaM2,
      usableRoofAreaM2: Math.round(roofSurfaceAreaM2 * (usableRoofPct / 100)),
    });
  }

  const viewModel = useMemo(
    () => getPolygonViewModel([], "manual-drawn", searchResult, manualPolygon),
    [searchResult, manualPolygon],
  );
  const roofMetrics = getRoofMetrics(value);

  function handleMapClick(event) {
    if (!viewModel.unproject) {
      return;
    }

    const svg = event.currentTarget;
    const screenPoint = new DOMPoint(event.clientX, event.clientY);
    const svgMatrix = svg.getScreenCTM();

    if (!svgMatrix) {
      return;
    }

    const localPoint = screenPoint.matrixTransform(svgMatrix.inverse());
    const x = localPoint.x;
    const y = localPoint.y;
    const point = viewModel.unproject(x, y);
    const nextPolygon = [...manualPolygon, point];
    const roofFootprintAreaM2 = Math.round(calculatePolygonAreaM2(nextPolygon));
    const pitchMultiplier = getRoofPitchMultiplier(value.roofType);
    const roofSurfaceAreaM2 = Math.round(roofFootprintAreaM2 * pitchMultiplier);
    const usableRoofPct = Number(value.usableRoofPct) || 75;

    onChange({
      ...value,
      roofSelectionMode: "manual",
      roofBuildingId: "manual-drawn",
      roofBuildingLabel: "Manual roof polygon",
      roofPolygon: nextPolygon,
      roofFootprintAreaM2,
      roofSurfaceAreaM2,
      usableRoofAreaM2: Math.round(roofSurfaceAreaM2 * (usableRoofPct / 100)),
    });
  }

  function handleUndoPoint() {
    const nextPolygon = manualPolygon.slice(0, -1);
    const roofFootprintAreaM2 = Math.round(calculatePolygonAreaM2(nextPolygon));
    const pitchMultiplier = getRoofPitchMultiplier(value.roofType);
    const roofSurfaceAreaM2 = Math.round(roofFootprintAreaM2 * pitchMultiplier);
    const usableRoofPct = Number(value.usableRoofPct) || 75;

    onChange({
      ...value,
      roofPolygon: nextPolygon,
      roofFootprintAreaM2,
      roofSurfaceAreaM2,
      usableRoofAreaM2: Math.round(roofSurfaceAreaM2 * (usableRoofPct / 100)),
    });
  }

  function handleClearPolygon() {
    onChange({
      ...value,
      roofPolygon: [],
      roofBuildingId: "manual-drawn",
      roofBuildingLabel: "Manual roof polygon",
      roofFootprintAreaM2: "",
      roofSurfaceAreaM2: "",
      usableRoofAreaM2: "",
    });
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.92))] p-6 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">
            OpenStreetMap roof picker
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          Polygon-based
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Address search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="14 Lindenstrasse, Berlin"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
          />
        </label>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="self-end rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(29,62,255,0.2)] disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {searching ? "Centering map..." : "Center map"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        {searchResult ? (
          <>
            Search match: <span className="font-semibold text-slate-900">{searchResult.displayName}</span>
          </>
        ) : (
          <>Search an address to center the map, then click around the roof edges to place points.</>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Manual draw
          </span>
          <div className="mt-2 text-sm leading-6 text-slate-700">
            Click around the roof edges to place points and trace the footprint directly on the map.
          </div>
        </div>

        <div className="rounded-2xl border border-brand-line bg-brand-soft px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Roof type source
          </span>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {value.roofType || "Set in Property intake"}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            Surface area uses the roof type chosen in Property intake.
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Manual roof outline
          </h4>
          <div className="text-xs text-slate-500">Click the map to place polygon points</div>
        </div>
        <svg
          viewBox={`0 0 ${viewModel.width} ${viewModel.height}`}
          className="h-[380px] w-full rounded-2xl bg-slate-100 cursor-crosshair"
          onClick={handleMapClick}
        >
          <defs>
            <clipPath id="roof-map-clip">
              <rect x="0" y="0" width={viewModel.width} height={viewModel.height} rx="20" ry="20" />
            </clipPath>
          </defs>
          <rect x="0" y="0" width={viewModel.width} height={viewModel.height} fill="#e2e8f0" />
          <g clipPath="url(#roof-map-clip)">
            {(viewModel.tiles || []).map((tile) => (
              <image
                key={tile.key}
                href={tile.href}
                x={tile.x}
                y={tile.y}
                width={tile.width}
                height={tile.height}
                preserveAspectRatio="none"
              />
            ))}
            <rect
              x="0"
              y="0"
              width={viewModel.width}
              height={viewModel.height}
              fill="rgba(248,250,252,0.12)"
            />
          </g>
          {viewModel.manualPolygon?.length ? (
            <polygon
              points={viewModel.manualPolygon.join(" ")}
              fill="#10b981"
              fillOpacity="0.45"
              stroke="#047857"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
          ) : null}
          {(viewModel.manualPoints || []).map((point, index) => (
            <circle
              key={`${point.x}-${point.y}-${index}`}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#047857"
            />
          ))}
          {viewModel.marker ? (
            <circle cx={viewModel.marker.x} cy={viewModel.marker.y} r="5" fill="#f59e0b" />
          ) : null}
        </svg>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>OpenStreetMap tiles with manual polygon overlay</span>
          <span>Zoom {viewModel.zoom || 0}</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[auto_auto_1fr]">
          <button
            type="button"
            onClick={handleUndoPoint}
            disabled={!manualPolygon.length}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Undo point
          </button>
          <button
            type="button"
            onClick={handleClearPolygon}
            disabled={!manualPolygon.length}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Clear polygon
          </button>
          <div className="rounded-2xl border border-brand-line bg-brand-soft px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Manual polygon:</span> {manualPolygon.length} points placed
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        <SmallMetric
          label="Footprint area"
          value={formatArea(roofMetrics.footprintAreaM2)}
          note="2D area from the selected or manually drawn polygon."
        />
        <SmallMetric
          label="Surface area"
          value={formatArea(roofMetrics.surfaceAreaM2)}
          note={`Footprint area x roof pitch factor (${roofMetrics.pitchMultiplier.toFixed(2)}x).`}
        />
        <label className="grid gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Usable roof share
          </span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="40"
              max="100"
              step="5"
              value={roofMetrics.usablePct}
              onChange={handleUsableChange}
              className="w-full accent-brand"
            />
            <span className="w-12 text-right text-sm font-semibold text-slate-900">
              {roofMetrics.usablePct}%
            </span>
          </div>
          <div className="text-xs leading-5 text-slate-500">
            Allowance for chimneys, setbacks, shading, and access gaps.
          </div>
        </label>
        <SmallMetric
          label="Usable roof area"
          value={formatArea(roofMetrics.usableRoofAreaM2)}
          note={`Surface area ${formatArea(roofMetrics.surfaceAreaM2)} x ${roofMetrics.usablePct}% usable share.`}
        />
      </div>

      <div className="mt-3 text-xs leading-5 text-slate-500">
        Pitch assumptions: {ROOF_PITCH_OPTIONS.map((option) => `${option.value} ${option.multiplier.toFixed(2)}x`).join(" • ")}
      </div>
    </section>
  );
}
