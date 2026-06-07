import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle, XCircle, Clock, FlaskConical } from 'lucide-react';
import { useProjectStore } from '@/stores';
import { generateId } from '@/lib/ingredientDict';
import { FAIL_REASONS } from '@/types';
import type { Trial } from '@/types';

type ResultType = Trial['result'];

const RESULT_CONFIG: Record<ResultType, { label: string; color: string; icon: typeof CheckCircle }> = {
  success: { label: '成功', color: 'var(--bamboo)', icon: CheckCircle },
  fail: { label: '失败', color: 'var(--vermilion)', icon: XCircle },
  partial: { label: '部分成功', color: 'var(--bronze)', icon: Clock },
};

export default function Trials() {
  const navigate = useNavigate();
  const { trials, currentProject, currentVersion, addTrial } = useProjectStore();
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<ResultType>('fail');
  const [failReason, setFailReason] = useState('');
  const [notes, setNotes] = useState('');

  const sortedTrials = useMemo(
    () => [...trials].sort((a, b) => b.round - a.round),
    [trials]
  );

  const nextRound = useMemo(
    () => (trials.length > 0 ? Math.max(...trials.map(t => t.round)) + 1 : 1),
    [trials]
  );

  const stats = useMemo(() => ({
    total: trials.length,
    success: trials.filter(t => t.result === 'success').length,
    fail: trials.filter(t => t.result === 'fail').length,
  }), [trials]);

  const handleSave = async () => {
    if (!currentProject || !currentVersion) return;
    const trial: Trial = {
      id: generateId(),
      projectId: currentProject.id,
      recipeVersionId: currentVersion.id,
      round: nextRound,
      trialDate: new Date().toISOString(),
      parameters: {},
      result,
      failReason: result === 'fail' ? failReason : '',
      photos: [],
      notes,
    };
    await addTrial(trial);
    setShowModal(false);
    setResult('fail');
    setFailReason('');
    setNotes('');
    navigate(`/trials/${trial.id}`);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-calligraphy text-2xl" style={{ color: 'var(--paper)' }}>试做记录</h2>
        <button className="ink-btn ink-btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> 新建试做
        </button>
      </div>

      <div className="flex gap-4">
        {[
          { label: '总试做', value: stats.total, color: 'var(--paper)', icon: FlaskConical },
          { label: '成功', value: stats.success, color: 'var(--bamboo)', icon: CheckCircle },
          { label: '失败', value: stats.fail, color: 'var(--vermilion)', icon: XCircle },
        ].map(s => (
          <div key={s.label} className="paper-card px-5 py-3 flex items-center gap-3">
            <s.icon size={20} style={{ color: s.color }} />
            <div>
              <div className="text-xs" style={{ color: 'var(--smoke-light)' }}>{s.label}</div>
              <div className="font-calligraphy text-xl" style={{ color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {sortedTrials.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <FlaskConical size={48} style={{ color: 'var(--smoke-light)' }} />
          <p className="font-calligraphy text-lg" style={{ color: 'var(--smoke-light)' }}>尚无试做记录</p>
        </div>
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-2 top-0 bottom-0 w-px" style={{ backgroundColor: 'rgba(245,240,232,0.12)' }} />
          <div className="flex flex-col gap-4">
            {sortedTrials.map(trial => {
              const cfg = RESULT_CONFIG[trial.result];
              const Icon = cfg.icon;
              return (
                <div
                  key={trial.id}
                  className="relative paper-card p-4 cursor-pointer ink-shadow-hover transition-all"
                  onClick={() => navigate(`/trials/${trial.id}`)}
                >
                  <div
                    className="absolute -left-6 top-5 w-3 h-3 rounded-full border-2"
                    style={{ borderColor: cfg.color, backgroundColor: 'var(--ink-deep)' }}
                  />
                  <div className="flex items-center gap-3 mb-2">
                    <span className="seal-badge" style={{ borderColor: cfg.color, color: cfg.color }}>
                      第{trial.round}轮
                    </span>
                    <span className="text-xs" style={{ color: 'var(--smoke-light)' }}>
                      {new Date(trial.trialDate).toLocaleDateString('zh-CN')}
                    </span>
                    <span
                      className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded"
                      style={{ color: cfg.color, backgroundColor: `${cfg.color}18` }}
                    >
                      <Icon size={12} /> {cfg.label}
                    </span>
                  </div>
                  {trial.notes && (
                    <p className="text-sm" style={{ color: 'var(--smoke-light)' }}>{trial.notes}</p>
                  )}
                  {trial.result === 'fail' && trial.failReason && (
                    <p className="text-xs mt-1" style={{ color: 'var(--vermilion)' }}>
                      原因：{trial.failReason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="paper-card p-6 w-full max-w-md animate-fade-in">
            <h3 className="font-calligraphy text-xl mb-4" style={{ color: 'var(--paper)' }}>
              新建试做 · 第{nextRound}轮
            </h3>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--smoke-light)' }}>试做结果</label>
                <div className="flex gap-2">
                  {(['success', 'fail', 'partial'] as ResultType[]).map(r => (
                    <button
                      key={r}
                      className="ink-btn flex-1 text-center justify-center"
                      style={{
                        backgroundColor: result === r ? RESULT_CONFIG[r].color : 'transparent',
                        color: result === r ? 'var(--paper)' : RESULT_CONFIG[r].color,
                        border: `1px solid ${RESULT_CONFIG[r].color}`,
                      }}
                      onClick={() => setResult(r)}
                    >
                      {RESULT_CONFIG[r].label}
                    </button>
                  ))}
                </div>
              </div>

              {result === 'fail' && (
                <div>
                  <label className="text-sm mb-1 block" style={{ color: 'var(--smoke-light)' }}>失败原因</label>
                  <select
                    className="ink-input"
                    value={failReason}
                    onChange={e => setFailReason(e.target.value)}
                  >
                    <option value="">请选择原因</option>
                    {FAIL_REASONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-sm mb-1 block" style={{ color: 'var(--smoke-light)' }}>备注</label>
                <textarea
                  className="ink-input min-h-[80px] resize-none"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="记录本次试做心得..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button className="ink-btn ink-btn-ghost" onClick={() => setShowModal(false)}>取消</button>
              <button className="ink-btn ink-btn-primary" onClick={handleSave}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
