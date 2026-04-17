/** Единый диапазон масштаба для ленты, строки состояния и колёсика мыши. */
export const ZOOM_MIN = 50;
export const ZOOM_MAX = 300;
export const ZOOM_WHEEL_STEP = 5;
export const ZOOM_BUTTON_STEP = 10;

export const ZOOM_PRESETS: { label: string; value: number }[] = [
  { label: "50%", value: 50 },
  { label: "75%", value: 75 },
  { label: "100%", value: 100 },
  { label: "125%", value: 125 },
  { label: "150%", value: 150 },
  { label: "200%", value: 200 },
  { label: "300%", value: 300 },
];

export const PAGE_WIDTH_CM = 21;
export const PAGE_HEIGHT_CM = 29.7;

export const DEFAULT_MARGINS = {
  top: 2,
  bottom: 2,
  left: 2,
  right: 2,
};

export const MARGIN_PRESETS = {
  normal: { top: 2, bottom: 2, left: 2, right: 2 },
  narrow: { top: 1.27, bottom: 1.27, left: 1.27, right: 1.27 },
  moderate: { top: 2.54, bottom: 2.54, left: 1.91, right: 1.91 },
  wide: { top: 2.54, bottom: 2.54, left: 3.17, right: 3.17 },
};

export const FONT_FAMILIES = [
  "Calibri",
  "Arial",
  "Times New Roman",
  "Courier New",
  "Georgia",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Garamond",
  "Comic Sans MS",
];

export const FONT_SIZES = [
  "8", "9", "10", "10.5", "11", "12", "14", "16",
  "18", "20", "22", "24", "26", "28", "36", "48", "72",
];

export const COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#B7B7B7", "#CCCCCC", "#D9D9D9", "#EFEFEF", "#F3F3F3", "#FFFFFF",
  "#980000", "#FF0000", "#FF9900", "#FFFF00", "#00FF00", "#00FFFF", "#4A86E8", "#0000FF", "#9900FF", "#FF00FF",
  "#E6B8AF", "#F4CCCC", "#FCE5CD", "#FFF2CC", "#D9EAD3", "#D0E0E3", "#C9DAF8", "#CFE2F3", "#D9D2E9", "#EAD1DC",
  "#DD7E6B", "#EA9999", "#F9CB9C", "#FFE599", "#B6D7A8", "#A2C4C9", "#A4C2F4", "#9FC5E8", "#B4A7D6", "#D5A6BD",
  "#CC4125", "#E06666", "#F6B26B", "#FFD966", "#93C47D", "#76A5AF", "#6D9EEB", "#6FA8DC", "#8E7CC3", "#C27BA0",
  "#A61C00", "#CC0000", "#E69138", "#F1C232", "#6AA84F", "#45818E", "#3C78D8", "#3D85C6", "#674EA7", "#A64D79",
  "#85200C", "#990000", "#B45F06", "#BF9000", "#38761D", "#134F5C", "#1155CC", "#0B5394", "#351C75", "#741B47",
];

export const LINE_SPACINGS = [
  { label: "1.0", value: 1.0 },
  { label: "1.15", value: 1.15 },
  { label: "1.5", value: 1.5 },
  { label: "2.0", value: 2.0 },
  { label: "2.5", value: 2.5 },
  { label: "3.0", value: 3.0 },
];
