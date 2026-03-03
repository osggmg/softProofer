export const colorsInput = [
  "rgb(255, 0, 0)", // red
  "rgb(0, 255, 0)", // green
  "rgb(0, 0, 255)", // blue
  "rgb(255, 255, 0)", // yellow
  "rgb(0, 255, 255)", // cyan
  "rgb(255, 0, 255)", // magenta
  "rgb(255, 255, 255)", // white

  "rgb(0, 0, 0)", // black
  "rgb(128, 128, 128)", // mid gray
  "rgb(64, 64, 64)", // dark gray
  "rgb(192, 192, 192)", // light gray
  "rgb(200, 100, 0)", // orange-ish
  "rgb(150, 0, 200)", // violet
  "rgb(0, 150, 100)", // teal

  "rgb(238, 4, 4)", // strong red
  "rgb(10, 200, 10)", // vivid green
  "rgb(10, 10, 200)", // vivid blue
  "rgb(240, 180, 40)", // warm yellow
  "rgb(50, 120, 200)", // desaturated blue
  "rgb(180, 60, 120)", // pinkish
  "rgb(90, 200, 180)", // light aqua
];

export const colorsInputAsAFlatMapU8Arr = new Uint8Array(
  colorsInput.flatMap((c) =>
    c
      .slice(4, -1)
      .split(",")
      .map((v) => Number(v.trim())),
  ),
);