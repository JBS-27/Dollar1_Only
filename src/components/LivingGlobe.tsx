import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import am5themes_Dark from "@amcharts/amcharts5/themes/Dark";
import am5geodata_worldLow from "@amcharts/amcharts5-geodata/worldLow";
import { useLayoutEffect, useRef, useState } from "react";
import type { CountryStat, LatestAwakening } from "../types";
import { PinCard } from "./PinCard";

type Props = {
  countries: CountryStat[];
  latest: LatestAwakening | null;
  total: number;
};

type CountryContext = { id?: string; name?: string };

const SPIN_MS = 30_000;

export default function LivingGlobe({ countries }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const countriesRef = useRef(countries);
  const paintRef = useRef<() => void>(() => {});
  const [selected, setSelected] = useState<CountryContext | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  countriesRef.current = countries;
  const selectedStat = countries.find((country) => country.code === selected?.id) ?? null;

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let root: am5.Root;
    try {
      root = am5.Root.new(host);
    } catch (error) {
      setChartError(error instanceof Error ? error.message : "Globe failed to start.");
      return;
    }
    root.setThemes([am5themes_Animated.new(root), am5themes_Dark.new(root)]);
    root.container.set(
      "background",
      am5.Rectangle.new(root, {
        fill: am5.color(0x000000),
        fillOpacity: 0,
      }),
    );

    const chart = root.container.children.push(
      am5map.MapChart.new(root, {
        projection: am5map.geoOrthographic(),
        panX: "rotateX",
        panY: "rotateY",
        rotationX: -20,
        rotationY: -16,
        wheelY: "zoom",
        wheelSensitivity: 0.7,
        minZoomLevel: 1,
        maxZoomLevel: 8,
        zoomLevel: 1,
        homeZoomLevel: 1,
        homeRotationX: -20,
        homeRotationY: -16,
      }),
    );

    const backgroundSeries = chart.series.unshift(am5map.MapPolygonSeries.new(root, {}));
    backgroundSeries.mapPolygons.template.setAll({
      fill: root.interfaceColors.get("alternativeBackground"),
      fillOpacity: 0.08,
      strokeOpacity: 0,
    });
    backgroundSeries.data.push({
      geometry: am5map.getGeoRectangle(90, 180, -90, -180),
    });

    const graticule = chart.series.push(am5map.GraticuleSeries.new(root, {}));
    graticule.mapLines.template.setAll({
      stroke: root.interfaceColors.get("grid"),
      strokeOpacity: 0.22,
    });

    const polygonSeries = chart.series.push(
      am5map.MapPolygonSeries.new(root, {
        geoJSON: am5geodata_worldLow,
      }),
    );

    polygonSeries.mapPolygons.template.setAll({
      tooltipText: "{name}",
      interactive: true,
      fill: root.interfaceColors.get("primaryButton"),
      stroke: root.interfaceColors.get("grid"),
      strokeOpacity: 0.55,
    });
    polygonSeries.mapPolygons.template.states.create("hover", {
      fill: root.interfaceColors.get("primaryButtonHover"),
    });
    polygonSeries.mapPolygons.template.states.create("active", {
      fill: root.interfaceColors.get("primaryButtonActive"),
    });

    const awakenedFill = root.interfaceColors.get("positive");
    const paint = () => {
      const codes = new Set(countriesRef.current.map((country) => country.code));
      polygonSeries.mapPolygons.each((polygon) => {
        const id = (polygon.dataItem?.dataContext as CountryContext | undefined)?.id;
        if (id && codes.has(id)) polygon.set("fill", awakenedFill);
      });
    };
    paintRef.current = paint;
    polygonSeries.events.on("datavalidated", paint);

    polygonSeries.mapPolygons.template.events.on("click", (event) => {
      polygonSeries.mapPolygons.each((polygon) => {
        if (polygon !== event.target) polygon.set("active", false);
      });
      event.target.set("active", true);
      const context = event.target.dataItem?.dataContext as CountryContext | undefined;
      setSelected(context?.id ? { id: context.id, name: context.name } : null);
    });

    let dragging = false;
    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      if (root.isDisposed()) return;
      const dt = Math.min(now - last, 50);
      last = now;
      if (!dragging) {
        const current = chart.get("rotationX", 0);
        chart.set("rotationX", current + (360 * dt) / SPIN_MS);
      }
      frame = window.requestAnimationFrame(tick);
    };

    const hold = () => {
      dragging = true;
    };
    const release = () => {
      dragging = false;
      last = performance.now();
    };

    chart.chartContainer.events.on("pointerdown", hold);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);

    chart.appear(1000, 100);
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      paintRef.current = () => {};
      root.dispose();
    };
  }, []);

  useLayoutEffect(() => {
    paintRef.current();
  }, [countries]);

  return (
    <section id="earth" className="relative z-[2] mx-auto w-full max-w-5xl px-4 pb-28 pt-8">
      <div className="mb-4 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-cyan-glow/60">The living globe</p>
        <h2 className="mt-3 font-display text-[1.35rem] font-medium tracking-[-0.03em] text-white/88 sm:text-[1.65rem]">
          Every country. The same Earth.
        </h2>
        <p className="mt-2 text-[13px] text-white/40">
          It turns on its own. Drag to take over. Scroll to zoom.
          {selected?.name ? ` Selected: ${selected.name}.` : ""}
        </p>
      </div>
      <div className="relative mx-auto aspect-square w-full max-h-[min(88svh,760px)] max-w-[760px]">
        <div ref={hostRef} className="earth-chart absolute inset-0" />
        {chartError && (
          <p className="absolute inset-x-6 top-6 text-center text-sm text-white/70">{chartError}</p>
        )}
        {selectedStat && (
          <div className="pointer-events-auto absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
            <PinCard
              countryCode={selectedStat.code}
              countryName={selectedStat.name}
              count={selectedStat.count}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>
    </section>
  );
}
