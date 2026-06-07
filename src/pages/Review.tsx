import { useState, useRef } from 'react';
import { Star, Lock, Unlock, Download, Users, GitCompare, FileText, TrendingUp, Send } from 'lucide-react';
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

const zeroScores = (): ReviewScore => ({ appearance: 0, aroma: 0, taste: 0, texture: 0, fidelity: 0 });

type ReviewerStatus = 'invited' | 'card_issued' | 'scored';

const STATUS_CONFIG: Record<ReviewerStatus, { label: string; color: string; bg: string }> = {
  invited: { label: '已邀请', color: 'var(--smoke-light)', bg: 'rgba(138,138,150,0.12)' },
  card_issued: { label: '已发放', color: 'var(--bronze)', bg: 'rgba(184,134,11,0.12)' },
  scored: { label: '已评分', color: 'var(--bamboo-light)', bg: 'rgba(45,106,79,0.12)' },
};

function getReviewerStatus(r: Review): ReviewerStatus {
  if (r.scored) return 'scored';
  if (r.scoreCardIssued) return 'card_issued';
  return 'invited';
}

export default function ReviewPage() {
  const { currentProject, currentVersion, recipeVersions, reviews, addReview, updateReview, lockVersion, selectVersion } = useProjectStore();
  const addToast = useUIStore(s => s.addToast);

  const [reviewerName, setReviewerName] = useState('');
  const [selectedReviewerId, setSelectedReviewerId] = useState('');
  const [scores, setScores] = useState<ReviewScore>(zeroScores());
  const [comments, setComments] = useState('');
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [confirmLock, setConfirmLock] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const [scoreCardOpen, setScoreCardOpen] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const scoreCardRef = useRef<HTMLDivElement>(null);

  if (!currentProject || !currentVersion) {
    return <div className="flex items-center justify-center h-[60vh] text-smoke-light">请先选择一个项目</div>;
  }

  const allVersionReviews = reviews.filter(r => r.projectId === currentProject.id);
  const versionReviews = reviews.filter(r => r.recipeVersionId === currentVersion.id);
  const unscoredReviewers = versionReviews.filter(r => !r.scored);
  const scoredReviewers = versionReviews.filter(r => r.scored);
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  const handleAddReviewer = async () => {
    if (!reviewerName.trim()) { addToast('请输入评委姓名', 'error'); return; }
    const exists = versionReviews.some(r => r.reviewerName === reviewerName.trim());
    if (exists) { addToast('该评委已存在', 'error'); return; }
    const review: Review = {
      id: generateId(), projectId: currentProject.id, recipeVersionId: currentVersion.id,
      reviewerName: reviewerName.trim(), scores: zeroScores(), totalScore: 0, comments: '',
      reviewedAt: new Date().toISOString(), scored: false, scoreCardIssued: false,
    };
    await addReview(review);
    setReviewerName('');
    addToast(`已邀请评委: ${review.reviewerName}`, 'success');
  };

  const handleIssueCard = async (reviewerId: string) => {
    const reviewer = versionReviews.find(r => r.id === reviewerId);
    if (!reviewer || reviewer.scoreCardIssued) return;
    await updateReview({ ...reviewer, scoreCardIssued: true });
    addToast(`评分卡已发放给 ${reviewer.reviewerName}`, 'success');
  };

  const handleBatchIssueCards = async () => {
    const unissued = versionReviews.filter(r => !r.scoreCardIssued && !r.scored);
    for (const r of unissued) {
      await updateReview({ ...r, scoreCardIssued: true });
    }
    if (unissued.length > 0) addToast(`已向 ${unissued.length} 位评委发放评分卡`, 'success');
    else addToast('所有评委已发放或已评分', 'info');
  };

  const handleSelectReviewer = (id: string) => {
    const reviewer = versionReviews.find(r => r.id === id);
    if (!reviewer) return;
    setSelectedReviewerId(id);
    setScores(reviewer.scored ? { ...reviewer.scores } : { appearance: 5, aroma: 5, taste: 5, texture: 5, fidelity: 5 });
    setComments(reviewer.comments);
  };

  const handleSaveScore = async () => {
    if (!selectedReviewerId) { addToast('请先选择一位评委', 'error'); return; }
    const reviewer = versionReviews.find(r => r.id === selectedReviewerId);
    if (!reviewer) return;
    const updated: Review = {
      ...reviewer, scores, totalScore, comments, reviewedAt: new Date().toISOString(), scored: true, scoreCardIssued: true,
    };
    await updateReview(updated);
    setSelectedReviewerId('');
    setScores(zeroScores());
    setComments('');
    addToast(`${reviewer.reviewerName} 的评分已保存`, 'success');
  };

  const handleLock = async () => {
    await lockVersion();
    setConfirmLock(false);
    addToast('配方已锁定', 'success');
  };

  const verA = recipeVersions.find(v => v.id === compareA);
  const verB = recipeVersions.find(v => v.id === compareB);

  const buildRadarData = () => {
    const reviewsA = allVersionReviews.filter(r => r.recipeVersionId === compareA && r.scored);
    const reviewsB = allVersionReviews.filter(r => r.recipeVersionId === compareB && r.scored);
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

  const handleDownloadScoreCard = async () => {
    if (!scoreCardRef.current) return;
    const canvas = await html2canvas(scoreCardRef.current, { backgroundColor: '#0f0f1a' });
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.download = `${currentProject.name}-评分卡-${date}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    addToast('评分卡已下载', 'success');
  };

  const handleExportScoreCardHtml = () => {
    const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>${currentProject.name} 评分卡</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap');
body{font-family:'Noto Serif SC',serif;max-width:600px;margin:0 auto;padding:32px;color:#1a1a2e;background:#f5f0e8;line-height:1.8;}
h1{font-size:24px;text-align:center;border-bottom:3px double #b8860b;padding-bottom:12px;}
.sub{text-align:center;color:#6a6a7a;font-size:13px;margin-bottom:24px;}
.dim{margin:16px 0;padding:8px 0;border-bottom:1px dashed #d0c8b8;}
.dim-name{font-weight:700;color:#c0392b;font-size:16px;}
.dim-score{float:right;font-size:20px;font-weight:700;color:#b8860b;}
.dim-bar{height:8px;background:#e8e0d0;border-radius:4px;margin-top:4px;}
.dim-bar-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#2d6a4f,#b8860b);}
.total{text-align:center;font-size:28px;font-weight:700;color:#c0392b;margin:20px 0;}
.footer{text-align:center;color:#6a6a7a;font-size:11px;margin-top:24px;}
</style></head><body>
<h1>${currentProject.name}</h1>
<div class="sub">评分卡 · 第${currentVersion.versionNumber}版</div>
${DIMS.map(d => `<div class="dim"><span class="dim-name">${d.label}</span><span class="dim-score">___ / 10</span><div class="dim-bar"><div class="dim-bar-fill" style="width:0%"></div></div></div>`).join('\n')}
<div class="total">总分：___ / 50</div>
<div style="margin-top:20px;padding:12px;background:#fff;border:1px solid #d0c8b8;"><strong>评语：</strong><br/><br/><br/></div>
<div class="footer">古味寻踪 · ${new Date().toLocaleDateString('zh-CN')}</div>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name}-评分卡.html`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('评分卡已导出（可打印给评委填写）', 'success');
    handleBatchIssueCards();
  };

  const avgScore = scoredReviewers.length > 0
    ? (scoredReviewers.reduce((s, r) => s + r.totalScore, 0) / scoredReviewers.length).toFixed(1)
    : '暂无';

  const issuedCount = versionReviews.filter(r => r.scoreCardIssued && !r.scored).length;
  const invitedCount = versionReviews.filter(r => !r.scoreCardIssued && !r.scored).length;

  const versionAvgHistory = recipeVersions
    .sort((a, b) => a.versionNumber - b.versionNumber)
    .map(v => {
      const vr = allVersionReviews.filter(r => r.recipeVersionId === v.id && r.scored);
      return {
        version: v.versionNumber,
        name: v.name,
        locked: v.locked,
        avg: vr.length ? +(vr.reduce((s, r) => s + r.totalScore, 0) / vr.length).toFixed(1) : null,
        reviewerCount: vr.length,
        totalReviewers: allVersionReviews.filter(r => r.recipeVersionId === v.id).length,
      };
    });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <h1 className="font-calligraphy text-3xl text-paper">评审发布</h1>

      <section className="paper-card p-6 space-y-4">
        <h2 className="font-calligraphy text-xl text-paper flex items-center gap-2"><Users size={20} /> 评委邀请</h2>
        <div className="flex gap-3">
          <input className="ink-input flex-1" placeholder="评委姓名" value={reviewerName}
            onChange={e => setReviewerName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddReviewer()} />
          <button onClick={handleAddReviewer} className="ink-btn ink-btn-secondary"><Users size={14} /> 添加评委</button>
        </div>
        {versionReviews.length > 0 && (
          <div className="space-y-2">
            {versionReviews.map(r => {
              const status = getReviewerStatus(r);
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={r.id} className="flex items-center justify-between px-4 py-2 rounded bg-paper/5">
                  <div className="flex items-center gap-2">
                    <span className="text-paper">{r.reviewerName}</span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ color: cfg.color, background: cfg.bg }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {!r.scoreCardIssued && !r.scored && (
                      <button onClick={() => handleIssueCard(r.id)} className="text-xs px-2 py-1 rounded transition hover:opacity-80"
                        style={{ color: 'var(--bronze)', border: '1px solid var(--bronze)', background: 'rgba(184,134,11,0.08)' }}>
                        <Send size={10} className="inline mr-1" />发放评分卡
                      </button>
                    )}
                    {r.scored ? (
                      <>
                        <span className="text-bronze text-sm font-bold">{r.totalScore}/50</span>
                        <span className="text-xs text-smoke-light">{new Date(r.reviewedAt).toLocaleDateString('zh-CN')}</span>
                      </>
                    ) : (
                      <span className="text-smoke-light text-sm">待回收</span>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-3 pt-2 text-sm">
              <span style={{ color: 'var(--smoke-light)' }}>已邀请：{invitedCount}</span>
              <span style={{ color: 'var(--bronze)' }}>已发放：{issuedCount}</span>
              <span style={{ color: 'var(--bamboo-light)' }}>已评分：{scoredReviewers.length}</span>
              <span style={{ color: 'var(--smoke-light)' }}>｜</span>
              <span style={{ color: 'var(--smoke-light)' }}>平均分：{avgScore}</span>
            </div>
          </div>
        )}
      </section>

      <section className="paper-card p-6 space-y-4">
        <h2 className="font-calligraphy text-xl text-paper flex items-center gap-2"><Star size={20} /> 打分面板</h2>
        {unscoredReviewers.length > 0 ? (
          <>
            <div>
              <label className="text-sm mb-1 block text-smoke-light">选择评委（已发放评分卡的优先）</label>
              <select className="ink-input" value={selectedReviewerId} onChange={e => handleSelectReviewer(e.target.value)}>
                <option value="">-- 请选择评委 --</option>
                {unscoredReviewers.sort((a, b) => (b.scoreCardIssued ? 1 : 0) - (a.scoreCardIssued ? 1 : 0)).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.reviewerName}{r.scoreCardIssued ? ' [已发卡]' : ' [未发卡]'}
                  </option>
                ))}
              </select>
            </div>
            {selectedReviewerId && (
              <>
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
              </>
            )}
          </>
        ) : versionReviews.length > 0 ? (
          <p className="text-smoke-light text-sm">所有评委已完成评分</p>
        ) : (
          <p className="text-smoke-light text-sm">请先邀请评委</p>
        )}
      </section>

      <section className="paper-card p-6 space-y-4">
        <h2 className="font-calligraphy text-xl text-paper flex items-center gap-2"><TrendingUp size={20} /> 评分状态总览</h2>
        {versionAvgHistory.length > 0 ? (
          <div className="space-y-3">
            {versionAvgHistory.map((vh, i) => {
              const prevAvg = i > 0 ? versionAvgHistory[i - 1].avg : null;
              const diff = vh.avg !== null && prevAvg !== null ? (vh.avg - prevAvg) : null;
              const allVr = allVersionReviews.filter(r => r.recipeVersionId === recipeVersions.find(rv => rv.versionNumber === vh.version)?.id);
              const vIssued = allVr.filter(r => r.scoreCardIssued && !r.scored).length;
              const vInvited = allVr.filter(r => !r.scoreCardIssued && !r.scored).length;
              return (
                <div key={vh.version} className="flex items-center gap-4 px-4 py-3 rounded" style={{ background: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.08)' }}>
                  <span className="font-calligraphy text-paper text-lg w-24">第{vh.version}版</span>
                  {vh.locked && <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--vermilion)', border: '1px solid var(--vermilion)' }}>🔒 锁定</span>}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span style={{ color: 'var(--smoke-light)' }}>已邀请 {vInvited}</span>
                      <span style={{ color: 'var(--bronze)' }}>已发放 {vIssued}</span>
                      <span style={{ color: 'var(--bamboo-light)' }}>已评分 {vh.reviewerCount}</span>
                    </div>
                    {vh.avg !== null && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-bronze font-bold text-lg">{vh.avg}</span>
                        <span className="text-smoke-light text-sm">/ 50</span>
                        {diff !== null && diff !== 0 && (
                          <span className={`text-xs font-bold ${diff > 0 ? 'text-bamboo-light' : 'text-vermilion'}`}>
                            {diff > 0 ? '↑' : '↓'}{Math.abs(diff).toFixed(1)}
                          </span>
                        )}
                      </div>
                    )}
                    {vh.avg === null && <span className="text-smoke-light text-sm">暂无评分</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-smoke-light text-sm">暂无版本数据</p>
        )}
      </section>

      <section className="paper-card p-6 space-y-4">
        <h2 className="font-calligraphy text-xl text-paper flex items-center gap-2"><FileText size={20} /> 评分卡</h2>
        <p className="text-sm text-smoke-light">生成可打印的评分卡。导出后会自动将评分卡标记为已发放给所有未发卡评委。</p>
        <div className="flex gap-3">
          <button onClick={handleExportScoreCardHtml} className="ink-btn ink-btn-secondary">
            <Download size={14} /> 导出评分卡（可打印）
          </button>
          <button onClick={handleBatchIssueCards} className="ink-btn ink-btn-ghost">
            <Send size={14} /> 批量发放
          </button>
          <button onClick={() => setScoreCardOpen(true)} className="ink-btn ink-btn-ghost">
            <FileText size={14} /> 预览评分卡
          </button>
        </div>
      </section>

      <section className="paper-card p-6 space-y-4">
        <h2 className="font-calligraphy text-xl text-paper flex items-center gap-2"><GitCompare size={20} /> 版本比较</h2>
        <div className="flex gap-4">
          <select className="ink-input flex-1" value={compareA} onChange={e => setCompareA(e.target.value)}>
            <option value="">选择版本 A</option>
            {recipeVersions.map(v => <option key={v.id} value={v.id}>{v.name}{v.locked ? ' 🔒' : ''}</option>)}
          </select>
          <select className="ink-input flex-1" value={compareB} onChange={e => setCompareB(e.target.value)}>
            <option value="">选择版本 B</option>
            {recipeVersions.map(v => <option key={v.id} value={v.id}>{v.name}{v.locked ? ' 🔒' : ''}</option>)}
          </select>
        </div>
        {verA && verB && (
          <>
            <div className="grid grid-cols-2 gap-4">
              {([verA, verB] as const).map(v => {
                const rv = allVersionReviews.filter(r => r.recipeVersionId === v.id && r.scored);
                return (
                  <div key={v.id} className="bg-paper/5 rounded p-4 space-y-1 text-sm">
                    <p className="font-bold text-paper">{v.name}{v.locked ? ' 🔒' : ''}</p>
                    <p className="text-smoke-light">步骤数: {v.steps.length}</p>
                    <p className="text-smoke-light">食材数: {v.ingredients.length}</p>
                    <p className="text-smoke-light">总时长: {v.steps.reduce((s, st) => s + st.durationMinutes, 0)} 分钟</p>
                    <p className="text-bronze">平均分: {rv.length ? (rv.reduce((s, r) => s + r.totalScore, 0) / rv.length).toFixed(1) : '暂无'}</p>
                  </div>
                );
              })}
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
                {scoredReviewers.map(r => (
                  <p key={r.id} className="text-paper">{r.reviewerName}: <span className="text-bronze font-bold">{r.totalScore}</span>/50</p>
                ))}
                {scoredReviewers.length === 0 && <p className="text-smoke-light">暂无评分</p>}
                {scoredReviewers.length > 0 && (
                  <p className="text-paper">平均分: <span className="text-bronze font-bold">{avgScore}</span>/50</p>
                )}
              </div>
              <div className="border-t border-bronze/30 pt-3 text-smoke-light text-xs">— 传世之味 · 不负匠心 —</div>
            </div>
            <div className="flex justify-center mt-4">
              <button onClick={handleDownloadPoster} className="ink-btn ink-btn-secondary"><Download size={14} /> 下载海报</button>
            </div>
          </div>
        </div>
      )}

      {scoreCardOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setScoreCardOpen(false)}>
          <div className="max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div ref={scoreCardRef} className="p-6 bg-[#0f0f1a] rounded border-2 border-bronze/40 space-y-4">
              <div className="text-center border-b border-bronze/30 pb-3">
                <h3 className="font-calligraphy text-2xl text-paper">{currentProject.name}</h3>
                <p className="text-smoke-light text-sm">评分卡 · 第{currentVersion.versionNumber}版</p>
              </div>
              {DIMS.map(d => (
                <div key={d.key} className="flex items-center justify-between border-b border-paper/10 pb-2">
                  <span className="font-bold text-paper">{d.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 rounded-full bg-paper/10" />
                    <span className="text-bronze font-bold w-16 text-right">___ / 10</span>
                  </div>
                </div>
              ))}
              <div className="text-center py-2">
                <span className="text-vermilion font-bold text-xl">总分：___ / 50</span>
              </div>
              <div className="border border-paper/10 rounded p-3 text-sm text-smoke-light">
                评语：<br /><br /><br />
              </div>
              <div className="text-center text-xs text-smoke-light">
                古味寻踪 · {new Date().toLocaleDateString('zh-CN')}
              </div>
            </div>
            <div className="flex justify-center gap-3 mt-4">
              <button onClick={handleDownloadScoreCard} className="ink-btn ink-btn-secondary"><Download size={14} /> 下载图片</button>
              <button onClick={handleExportScoreCardHtml} className="ink-btn ink-btn-ghost"><FileText size={14} /> 导出HTML</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
