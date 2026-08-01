export function serializeSvg(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone
    .querySelectorAll(
      ".kizkatt-selection-overlay, .kizkatt-line-overlay, .kizkatt-multi-selection"
    )
    .forEach((element) => element.remove());

  return new XMLSerializer().serializeToString(clone);
}
