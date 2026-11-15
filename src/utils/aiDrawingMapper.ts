import {
  AiDrawingResponse,
  AiDrawingStyle,
  Stroke,
  TextBlock,
  getMetallicInkConfig,
} from '../types/notebook';

export function buildStrokesAndLabelsFromAiResponse(params: {
  data: Partial<AiDrawingResponse>;
  box: { x: number; y: number; width: number; height: number };
  style: AiDrawingStyle;
  color: string;
  baseWidth: number;
}): { strokes: Stroke[]; labels: TextBlock[] } {
  const { data, box, style, color, baseWidth } = params;
  const groupId = `aidraw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const isMetallic = style !== 'pencil' && Boolean(getMetallicInkConfig(color));
  const pad = 10;
  const innerW = Math.max(60, box.width - pad * 2);
  const innerH = Math.max(60, box.height - pad * 2);

  const mapPoint = (pt: { x: number; y: number }) => ({
    x: Number((box.x + pad + (pt.x / 1000) * innerW).toFixed(1)),
    y: Number((box.y + pad + (pt.y / 1000) * innerH).toFixed(1)),
  });

  const baseStrokeW = Math.max(1.5, Math.min(3.5, baseWidth * 0.72));

  const strokes: Stroke[] = (data.strokes ?? []).map((spec, idx) => {
    const mappedPts = spec.points.map(mapPoint);
    let tool: Stroke['tool'] = style === 'pencil' ? 'pencil' : 'pen';
    if (spec.kind === 'line') tool = 'line';
    else if (spec.kind === 'rect') tool = 'rect';
    else if (spec.kind === 'circle') tool = 'circle';
    else if (spec.kind === 'arrow') tool = 'arrow';

    const weightMult =
      spec.weight === 'bold'
        ? 1.45
        : spec.weight === 'thin'
          ? 0.65
          : spec.weight === 'shade'
            ? 0.85
            : 1;

    return {
      id: `${groupId}_s${idx}`,
      aiGroupId: groupId,
      tool,
      color,
      width: Number((baseStrokeW * weightMult).toFixed(2)),
      opacity:
        typeof spec.opacity === 'number'
          ? spec.opacity
          : spec.weight === 'shade'
            ? 0.42
            : style === 'pencil'
              ? 0.86
              : 0.96,
      isMetallic,
      points: mappedPts,
    };
  });

  const labels: TextBlock[] = (data.labels ?? []).map((lbl, idx) => {
    const pos = mapPoint({ x: lbl.x, y: lbl.y });
    return {
      id: `${groupId}_l${idx}`,
      x: Math.max(24, pos.x - 16),
      y: Math.max(88, pos.y - 12),
      width: 110,
      content: lbl.text,
      font: style === 'diagram' ? 'serif' : 'handwriting',
      fontSize: style === 'diagram' ? 15 : 18,
      color,
      isMetallic,
    };
  });

  return { strokes, labels };
}
