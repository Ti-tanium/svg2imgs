type SVGTransformListCustom = {
  length: number;
} & SVGTransformList;

export function freezeAnimation(
  svg: SVGSVGElement,
  time: number
): SVGSVGElement {
  svg.setCurrentTime(time);

  // deep clone svg element
  const svg_ = svg.cloneNode(true) as SVGSVGElement;

  const switchAttributes =
    (animateTag: string) =>
    (
      animate:
        | SVGAnimateTransformElement
        | SVGAnimateElement
        | SVGAnimateMotionElement,
      index: number
    ) => {
      const target = animate.targetElement as SVGPathElement;
      const target_ = svg_.querySelectorAll(animateTag)[index].parentElement;

      if (!target || !target_)
        throw new Error('animation element does not have a parent.');

      const attr = animate.getAttribute('attributeName');
      if (!attr)
        throw new Error(
          "animation tag in the svg does not have 'attributeName'"
        );

      const type = animate.getAttribute('attributeType');

      // differentiate attribute type
      if (type === 'CSS') {
        const value = window.getComputedStyle(target).getPropertyValue(attr);
        target_.style.setProperty(attr, value);
      } else {
        // XML type by default
        let matrix, value, transformList, transformValue;
        switch (attr) {
          case 'transform':
            transformList = target.transform.animVal as SVGTransformListCustom;
            transformValue = [];
            for (let i = 0; i < transformList.length; i++) {
              const svgTransform = transformList.getItem(i);
              switch (svgTransform.type) {
                case (SVGTransform.SVG_TRANSFORM_MATRIX,
                SVGTransform.SVG_TRANSFORM_TRANSLATE):
                  matrix = svgTransform.matrix;
                  transformValue.push(
                    `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`
                  );
                  break;
                case SVGTransform.SVG_TRANSFORM_ROTATE:
                  transformValue.push(`rotate(${svgTransform.angle})`);
                  break;
              }
            }
            target_.setAttribute(attr, transformValue.join(' '));
            break;
          default:
            // FIXME: do not support attr: d
            value = (target as any)[attr]?.animVal.valueAsString;
            target_.setAttribute(attr, value || target.getAttribute(attr));
            break;
        }
      }
    };

  // handling animateTransform tag.
  (
    svg.querySelectorAll(
      'animateTransform'
    ) as unknown as SVGAnimateTransformElement[]
  ).forEach(switchAttributes('animateTransform'));

  // handling animate tag.
  (svg.querySelectorAll('animate') as unknown as SVGAnimateElement[]).forEach(
    switchAttributes('animate')
  );

  return svg_;
}

/**
 * convert an animated svg to a series of images
 * @param svgEl svg html element
 * @param fps frame per second
 * @param duration duration of the animation
 * @returns Array of HTMLImageElements
 */
export function svg2imgs(svgEl: SVGSVGElement, fps = 30): HTMLImageElement[] {
  // pause svg animation in the beginning
  svgEl.pauseAnimations();
  svgEl.setCurrentTime(0);

  const images: HTMLImageElement[] = [];
  const interval = 1 / fps;

  // find maximum animation duration in the svg.
  const duration = Array.from(svgEl.querySelectorAll('[dur]')).reduce(
    (maxDuration, element) => {
      let duration = element.getAttribute('dur');
      if (!duration) return 0;
      if (isNaN(Number(duration))) {
        // handling dur="15s"
        duration = duration.slice(0, -1);
      }
      return Math.max(maxDuration, Number(duration));
    },
    0
  );

  for (let time = 0; time < duration; time += interval) {
    const svg_ = freezeAnimation(svgEl, time);
    // create image from the cloned svg
    const xml: string = new XMLSerializer().serializeToString(svg_);
    // disable xml animation
    const staticXml = xml
      .replace(/<animate/g, '<not_anim')
      .replace(/<\/animate/g, '</not_anim');
    // FIXME: save ImageData instead of base64 encoded data.
    const data = 'data:image/svg+xml;base64,' + btoa(staticXml);
    const image = new Image();
    image.src = data;
    images.push(image);
  }

  return images;
}
