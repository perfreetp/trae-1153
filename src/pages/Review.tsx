import { useState, useRef } from 'react';
import { Star, Lock, Unlock, Download, Users, GitCompare } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend } from 'recharts';
import html2canvas from 'html2canvas';
import { useProjectStore, useUIStore } from '@/stores';
import { generateId } from '@/lib/ingredientDict';
import type { Review, ReviewScore } from '@/types';

const DIMS: { key: keyof ReviewScore; label: string }[] = [
  { key: 'appearance', label: '色' }, { key: 'aroma', label: '香' },
  { key: 'taste', label: '味' }, { key: 'texture', label: '形' },
  { key: 'fidelity', label: '还原度' },
];

const emptyScores = (): ReviewScore => ({ appearance: 5, aroma: 5, taste: 5, texture: 5, fidelity: 5 });

export default function ReviewPage() {
  const { currentProject, currentVersion, recipeVersions, reviews, addReview, lockVersion, selectVersion } = useProjectStore();
  const addToast = useUIStore(s => s.addToast);

  const [reviewerName, setReviewerName] = useState('');
  const [scores, setScores] = useState<ReviewScore>(emptyScores());
  const [comments, setComments] = useState('');
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [confirmLock, setConfirmLock] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  if (!currentProject || !currentVersion) {
    return <div className="flex items-center justify-center h-[60vh] text-smoke-light">请先选择一个项目</div>;
  }

  const versionReviews = reviews.filter(r => r.recipeVersionId === currentVersion.id);
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  const handleAddReviewer = () => {
    if (!reviewerName.trim()) { addToast('请输入评委姓名', 'error'); return; }
    const review: Review = {
      id: generateId(), projectId: currentProject.id, recipeVersionId: currentVersion.id,
      reviewerName: reviewerName.trim(), scores: emptyScores(), totalScore: 25, comments: '', reviewedAt: new Date().toISOString(),
    };
    addReview(review);
    setReviewerName('');
    addToast(`已邀请评委: ${review.reviewerName}`, 'success');
  };

  const handleSaveScore = async () => {
    const existing = versionReviews.find(r => r.reviewerName === reviewerName.trim());
    if (existing) {
      addToast('该评委已有评分记录', 'error'); return;
    }
    const review: Review = {
      id: generateId(), projectId: currentProject.id, recipeVersionId: currentVersion.id,
      reviewerName: reviewerName.trim() || '匿名评委', scores, totalScore, comments, reviewedAt: new Date().toISOString(),
    };
    await addReview(review);
    setScores(emptyScores()); setComments('');
    addToast('评分已保存', 'success');
  };

  const handleLock = async () => {
    await lockVersion();
    setConfirmLock(false);
    addToast('配方已锁定', 'success');
  };

  const verA = recipeVersions.find(v => v.id === compareA);
  const verB = recipeVersions.find(v => v.id === compareB);

  const buildRadarData = () => {
    const reviewsA = reviews.filter(r => r.recipeVersionId === compareA);
    const reviewsB = reviews.filter(r => r.recipeVersionId === compareB);
    const avg = (arr: Review[], key: keyof ReviewScore) => arr.length ? +(arr.reduce((s, r) => s + r.scores[key], 0) / arr.length).toFixed(1) : 0;
    return DIMS.map(d => ({ dimension: d.label, [verA?.name || 'A']: avg(reviewsA, d.key), [verB?.name || 'B']: avg(reviewsB, d.key) }));
  };

  const handleDownloadPoster = async () => {
    if (!posterRef.current) return;
    const canvas = await html2canvas(posterRef.current, { backgroundColor: '#0f0f1a' });
    const link = document.createElement('a');
    link.download = `${currentProject.name}_poster.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    addToast('海报已下载', 'success');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <h1 className="font-calligraphy text-3xl text-paper">评审发布</h1>

      <section className="paper-card p-6 space-y-4">
        <h2 className="font-calligraphy text-xl text-paper flex items-center gap-2"><Users size={20} /> 评委邀请</h2>
        <div className="flex gap-3">
          <input className="ink-input flex-1" placeholder="评委姓名" value={reviewerName} onChange={e => setReviewerName(e.target.value)} />
          <button onClick={handleAddReviewer} className="ink-btn ink-btn-secondary"><Users size={14} /> 添加评委</button>
        </div>
        {versionReviews.length > 0 && (
          <div className="space-y-2">
            {versionReviews.map(r => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2 rounded bg-paper/5">
                <span className="text-paper">{r.reviewerName}</span>
                <span className={`text-sm ${r.totalScore > 0 ? 'text-bronze' : 'text-smoke-light'}`}>
                  {r.totalScore > 0 ? `${r.totalScore} 分` : '未评分'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="paper-card p-6 space-y-4">
        <h2 className="font-calligraphy text-xl text-paper flex items-center gap-2"><Star size={20} /> 打分面板</h2>
        <div className="space-y-3">
          {DIMS.map(d => (
            <div key={d.key} className="flex items-center gap-4">
              <span className="w-16 text-bronze font-bold">{d.label}</span>
              <input type="range" min={1} max={10} value={scores[d.key]}
                onChange={e => setScores({ ...scores, [d.key]: Number(e.target.value) })}
                className="flex-1 accent-[#b8860b]" />
              <span className="w-8 text-center text-paper font-bold">{scores[d.key]}</span>
            </div>
          ))}
        </div>
        <div className="text-right text-lg text-bronze font-bold">总分: {totalScore} / 50</div>
        <textarea className="ink-input min-h-[80px] resize-y" placeholder="评语..." value={comments}
          onChange={e => setComments(e.target.value)} />
        <button onClick={handleSaveScore} className="ink-btn ink-btn-primary"><Star size={14} /> 保存评分</button>
      </section>

      <section className="paper-card p-6 space-y-4">
        <h2 className="font-calligraphy text-xl text-paper flex items-center gap-2"><GitCompare size={20} /> 版本比较</h2>
        <div className="flex gap-4">
          <select className="ink-input flex-1" value={compareA} onChange={e => setCompareA(e.target.value)}>
            <option value="">选择版本 A</option>
            {recipeVersions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select className="ink-input flex-1" value={compareB} onChange={e => setCompareB(e.target.value)}>
            <option value="">选择版本 B</option>
            {recipeVersions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        {verA && verB && (
          <>
            <div className="grid grid-cols-2 gap-4">
              {([verA, verB] as const).map(v => (
                <div key={v.id} className="bg-paper/5 rounded p-4 space-y-1 text-sm">
                  <p className="font-bold text-paper">{v.name}</p>
                  <p className="text-smoke-light">步骤数: {v.steps.length}</p>
                  <p className="text-smoke-light">食材数: {v.ingredients.length}</p>
                  <p className="text-smoke-light">总时长: {v.steps.reduce((s, st) => s + st.durationMinutes, 0)} 分钟</p>
                  <p className="text-bronze">平均分: {(() => { const rv = reviews.filter(r => r.recipeVersionId === v.id); return rv.length ? (rv.reduce((s, r) => s + r.totalScore, 0) / rv.length).toFixed(1) : '暂无'; })()}</p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={buildRadarData()}>
                <PolarGrid stroke="rgba(245,240,232,0.15)" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: '#b8860b', fontSize: 13 }} />
                <Radar name={verA.name} dataKey={verA.name} stroke="#c0392b" fill="#c0392b" fillOpacity={0.2} />
                <Radar name={verB.name} dataKey={verB.name} stroke="#2d6a4f" fill="#2d6a4f" fillOpacity={0.2} />
                <Legend wrapperStyle={{ color: '#f5f0e8' }} />
              </RadarChart>
            </ResponsiveContainer>
          </>
        )}
      </section>

      <section className="paper-card p-6 space-y-4">
        <h2 className="font-calligraphy text-xl text-paper flex items-center gap-2">
          {currentVersion.locked ? <Lock size={20} /> : <Unlock size={20} />} 配方锁定
        </h2>
        {currentVersion.locked ? (
          <div className="flex items-center gap-3">
            <span className="seal-badge animate-seal">已锁定</span>
            <span className="text-smoke-light text-sm">配方已锁定，不可编辑</span>
          </div>
        ) : (
          <>
            {confirmLock ? (
              <div className="space-y-3">
                <p className="text-vermilion">锁定后将无法编辑，确定锁定？</p>
                <div className="flex gap-3">
                  <button onClick={handleLock} className="ink-btn ink-btn-primary"><Lock size={14} /> 确认锁定</button>
                  <button onClick={() => setConfirmLock(false)} className="ink-btn ink-btn-ghost">取消</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmLock(true)} className="ink-btn ink-btn-primary"><Lock size={14} /> 锁定配方</button>
            )}
          </>
        )}
      </section>

      <section className="paper-card p-6 space-y-4">
        <h2 className="font-calligraphy text-xl text-paper flex items-center gap-2"><Download size={20} /> 海报生成</h2>
        <button onClick={() => setPosterOpen(true)} className="ink-btn ink-btn-secondary"><Download size={14} /> 生成海报</button>
      </section>

      {posterOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setPosterOpen(false)}>
          <div className="max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <div ref={posterRef} className="border-4 border-double border-bronze/60 p-8 bg-[#0f0f1a] rounded text-center space-y-6"
              style={{ backgroundImage: 'linear-gradient(135deg, rgba(184,134,11,0.05) 0%, transparent 50%, rgba(192,57,43,0.05) 100%)' }}>
              <div className="border-b border-bronze/30 pb-4">
                <h3 className="font-calligraphy text-4xl text-paper">{currentProject.name}</h3>
                <p className="text-smoke-light text-sm mt-1">失传菜谱复原</p>
              </div>
              <div className="text-left text-sm space-y-1 text-paper/80">
                <p className="text-bronze font-bold mb-2">食材摘要</p>
                {currentVersion.ingredients.slice(0, 8).map(i => (
                  <p key={i.id}>{i.name} · {i.quantity}{i.unit}</p>
                ))}
                {currentVersion.ingredients.length > 8 && <p className="text-smoke-light">...等{currentVersion.ingredients.length}种食材</p>}
              </div>
              <div className="space-y-2">
                <p className="text-bronze font-bold">评分</p>
                {versionReviews.map(r => (
                  <p key={r.id} className="text-paper">{r.reviewerName}: <span className="text-bronze font-bold">{r.totalScore}</span>/50</p>
                ))}
                {versionReviews.length === 0 && <p className="text-smoke-light">暂无评分</p>}
              </div>
              <div className="border-t border-bronze/30 pt-3 text-smoke-light text-xs">— 传世之味 · 不负匠心 —</div>
            </div>
            <div className="flex justify-center mt-4">
              <button onClick={handleDownloadPoster} className="ink-btn ink-btn-secondary"><Download size={14} /> 下载海报</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
