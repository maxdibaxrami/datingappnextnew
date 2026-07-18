'use client';

import React, { useRef } from "react";
import {
  KeenSliderOptions,
  TrackDetails,
  useKeenSlider,
} from "keen-slider/react";

interface WheelProps {
  initIdx?: number;
  label?: string;
  length: number;
  loop?: boolean;
  perspective?: "left" | "right" | "center";
  setValue?: (relative: number, absolute: number) => string;
  width: number;
  onChange?: (index: number) => void;
}

export default function Wheel(props: WheelProps) {
  const {
    initIdx = 0,
    label,
    length,
    loop,
    onChange,
    perspective = "center",
    setValue,
    width,
  } = props;
  const wheelSize = 20;
  const slides = length;
  const slideDegree = 360 / wheelSize;
  const slidesPerView = loop ? 9 : 1;
  const [sliderState, setSliderState] = React.useState<TrackDetails | null>(
    null
  );
  const size = useRef(0);
  const options = React.useMemo<KeenSliderOptions>(
    () => ({
      slides: {
        number: slides,
        origin: loop ? "center" : "auto",
        perView: slidesPerView,
      },
      vertical: true,
      initial: initIdx,
      loop,
      dragSpeed: (val) => {
        const height = size.current;
        return (
          val *
          (height /
            ((height / 2) * Math.tan(slideDegree * (Math.PI / 180))) /
            slidesPerView)
        );
      },
      created: (s) => {
        size.current = s.size;
      },
      updated: (s) => {
        size.current = s.size;
      },
      detailsChanged: (s) => {
        setSliderState(s.track.details);
      },
      slideChanged: (s) => {
        onChange?.(s.track.details.rel);
      },
      rubberband: !loop,
      mode: "free-snap",
    }),
    [initIdx, loop, onChange, slideDegree, slides, slidesPerView],
  );

  const [sliderRef, slider] = useKeenSlider<HTMLDivElement>(options);
  const [radius, setRadius] = React.useState(0);

  React.useEffect(() => {
    if (slider.current) setRadius(slider.current.size / 2);
  }, [slider]);

  function slideValues() {
    if (!sliderState) return [];
    const offset = loop ? 1 / 2 - 1 / slidesPerView / 2 : 0;

    const values = [];
    for (let i = 0; i < slides; i++) {
      const distance = sliderState
        ? (sliderState.slides[i].distance - offset) * slidesPerView
        : 0;
      const rotate =
        Math.abs(distance) > wheelSize / 2
          ? 180
          : distance * (360 / wheelSize) * -1;
      const style = {
        transform: `rotateX(${rotate}deg) translateZ(${radius}px)`,
        WebkitTransform: `rotateX(${rotate}deg) translateZ(${radius}px)`,
      };
      const value = setValue
        ? setValue(i, sliderState.abs + Math.round(distance))
        : i;
      values.push({ style, value });
    }
    return values;
  }

  return (
    <div
      className={"wheel keen-slider wheel--perspective-" + perspective}
      ref={sliderRef}
    >
      <div
        className="wheel__shadow-top"
        style={{
          transform: `translateZ(${radius}px)`,
          WebkitTransform: `translateZ(${radius}px)`,
        }}
      />
      <div className="wheel__inner">
        <div className="wheel__slides" style={{ width: width + "px" }}>
          {slideValues().map(({ style, value }, idx) => (
            <div className="wheel__slide" style={style} key={idx}>
              <span>{value}</span>
            </div>
          ))}
        </div>
        {label && (
          <div
            className="wheel__label"
            style={{
              transform: `translateZ(${radius}px)`,
              WebkitTransform: `translateZ(${radius}px)`,
            }}
          >
            {label}
          </div>
        )}
      </div>
      <div
        className="wheel__shadow-bottom"
        style={{
          transform: `translateZ(${radius}px)`,
          WebkitTransform: `translateZ(${radius}px)`,
        }}
      />
    </div>
  );
}
