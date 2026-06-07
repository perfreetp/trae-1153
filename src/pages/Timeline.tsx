import { useState, useMemo } from 'react';
import { Clock, Flame, Star, ChevronRight } from 'lucide-react';
import { useProjectStore } from '@/stores';
import { HEAT_LABELS, HEAT_COLORS } from '@/types';
import type { RecipeStep } from '@/types';

const BAR_HEIGHT = 44;
const ROW_GAP = 6;
const PX_PER_MIN = 16;
const RULER_HEIGHT = 32;
const LABEL_WIDTH = 120;

export default function Timeline() {
  const { currentVersion } = useProjectStore();
  const [selectedStep, setSelectedStep] = useState<RecipeStep | null>(null);

  const steps = useMemo(
    () => [...(currentVersion?.steps ?? [])].sort((a, b) => a.order - b.order),
    [currentVersion]
  );

  const totalMinutes = useMemo(() => steps.reduce((s, st) => s + st.durationMinutes, 0), [steps]);

  const keyNodes = useMemo(() => steps.filter(s => s.isKeyNode), [steps]);

  const timeMarkers = useMemo(() => {
    const max = Math.max(totalMinutes, 5);
    const count = Math.ceil(max / 5);
    return Array.from({ length: count + 1 }, (_, i) => i * 5);
  }, [totalMinutes]);

  const chartWidth = useMemo(
    () => Math.max(totalMinutes, 5) * PX_PER_MIN + LABEL_WIDTH + 40,
    [totalMinutes]
  );

  if (!currentVersion || steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Clock size={48} style={{ color: 'var(--smoke-light)' }} />
        <p className="font-calligraphy text-xl" style={{ color: 'var(--smoke-light)' }}>
          {currentVersion ? '暂无工序步骤，请先在配方板中添加' : '请先选择项目与版本'}
        </p>
      </div>
    );
  }

  let offsetMin = 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-calligraphy text-2xl" style={{ color: 'var(--paper)' }}>工序时间线</h2>
        <div className="flex items-center gap-2 px-4 py-2 paper-card rounded-md">
          <Clock size={16} style={{ color: 'var(--bronze)' }} />
          <span className="text-sm" style={{ color: 'var(--smoke-light)' }}>总时长</span>
          <span className="font-calligraphy text-lg" style={{ color: 'var(--vermilion)' }}>
            {totalMinutes} 分钟
          </span>
        </div>
      </div>

      <div className="flex gap-5">
        <div className="flex-1 paper-card p-4 overflow-x-auto">
          <div style={{ width: chartWidth, minWidth: '100%' }}>
            <div
              className="flex border-b"
              style={{
                height: RULER_HEIGHT,
                borderColor: 'rgba(245,240,232,0.1)',
                paddingLeft: LABEL_WIDTH,
              }}
            >
              {timeMarkers.map(m => (
                <div
                  key={m}
                  className="text-xs flex-shrink-0"
                  style={{
                    width: 5 * PX_PER_MIN,
                    color: 'var(--smoke-light)',
                    borderLeft: '1px solid rgba(245,240,232,0.06)',
                    paddingLeft: 4,
                    paddingTop: 6,
                  }}
                >
                  {m}'
                </div>
              ))}
            </div>

            {steps.map((step) => {
              const startMin = offsetMin;
              offsetMin += step.durationMinutes;
              const color = HEAT_COLORS[step.heatLevel];

              return (
                <div
                  key={step.id}
                  className="flex items-center"
                  style={{ height: BAR_HEIGHT + ROW_GAP }}
                >
                  <div
                    className="flex items-center gap-1 flex-shrink-0 text-xs truncate pr-2"
                    style={{
                      width: LABEL_WIDTH,
                      color: step.isKeyNode ? 'var(--vermilion)' : 'var(--paper)',
                    }}
                  >
                    {step.isKeyNode && <Star size={12} style={{ color: 'var(--vermilion)' }} />}
                    <span className="truncate">{step.name}</span>
                  </div>

                  <div className="relative flex-1" style={{ height: BAR_HEIGHT }}>
                    <div
                      className="absolute top-1 rounded cursor-pointer transition-all duration-200 flex items-center px-2"
                      style={{
                        left: startMin * PX_PER_MIN,
                        width: step.durationMinutes * PX_PER_MIN,
                        height: BAR_HEIGHT - 8,
                        backgroundColor: color,
                        opacity: selectedStep?.id === step.id ? 1 : 0.8,
                        boxShadow:
                          selectedStep?.id === step.id
                            ? `0 0 12px ${color}66`
                            : 'none',
                      }}
                      onClick={() =>
                        setSelectedStep(selectedStep?.id === step.id ? null : step)
                      }
                    >
                      {step.isKeyNode && (
                        <span
                          className="mr-1 flex-shrink-0"
                          style={{
                            color: 'var(--vermilion)',
                            fontSize: 10,
                            lineHeight: 1,
                          }}
                        >
                          ◆
                        </span>
                      )}
                      <span
                        className="text-xs truncate"
                        style={{ color: 'var(--paper)' }}
                      >
                        {step.name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-72 flex-shrink-0 flex flex-col gap-4">
          {selectedStep && (
            <div className="paper-card p-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <ChevronRight size={16} style={{ color: 'var(--vermilion)' }} />
                <h3 className="font-calligraphy text-lg" style={{ color: 'var(--paper)' }}>
                  {selectedStep.name}
                </h3>
              </div>
              <p className="text-sm mb-3" style={{ color: 'var(--smoke-light)' }}>
                {selectedStep.description || '暂无描述'}
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Flame size={14} style={{ color: HEAT_COLORS[selectedStep.heatLevel] }} />
                  <span className="text-sm" style={{ color: 'var(--paper)' }}>
                    {HEAT_LABELS[selectedStep.heatLevel]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} style={{ color: 'var(--bronze)' }} />
                  <span className="text-sm" style={{ color: 'var(--paper)' }}>
                    {selectedStep.durationMinutes} 分钟
                  </span>
                </div>
                {selectedStep.ingredientRefs.length > 0 && (
                  <div className="text-sm" style={{ color: 'var(--smoke-light)' }}>
                    食材：{selectedStep.ingredientRefs.join('、')}
                  </div>
                )}
                {selectedStep.notes && (
                  <div className="text-sm" style={{ color: 'var(--smoke-light)' }}>
                    备注：{selectedStep.notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {keyNodes.length > 0 && (
            <div className="paper-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Star size={14} style={{ color: 'var(--vermilion)' }} />
                <h3 className="font-calligraphy text-base" style={{ color: 'var(--paper)' }}>
                  关键节点
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {keyNodes.map(n => (
                  <div
                    key={n.id}
                    className="flex items-start gap-2 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--smoke-light)' }}
                    onClick={() => setSelectedStep(n)}
                  >
                    <span style={{ color: 'var(--vermilion)', fontSize: 10, marginTop: 4 }}>◆</span>
                    <div>
                      <span style={{ color: 'var(--paper)' }}>{n.name}</span>
                      {n.notes && <p className="text-xs mt-0.5">{n.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
