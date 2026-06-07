import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Camera, XCircle } from 'lucide-react';
import { useProjectStore } from '@/stores';
import { FAIL_REASONS } from '@/types';

export default function TrialDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trials, currentVersion, recipeVersions, updateTrial } = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trial = trials.find(t => t.id === id);

  const [parameters, setParameters] = useState<Record<string, string>>(trial?.parameters ?? {});
  const [photos, setPhotos] = useState<string[]>(trial?.photos ?? []);
  const [notes, setNotes] = useState(trial?.notes ?? '');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [dragOver, setDragOver] = useState(false);

  if (!trial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <XCircle size={48} style={{ color: 'var(--smoke-light)' }} />
        <p className="font-calligraphy text-lg" style={{ color: 'var(--smoke-light)' }}>未找到试做记录</p>
        <button className="ink-btn ink-btn-ghost" onClick={() => navigate('/trials')}>
          <ArrowLeft size={16} /> 返回列表
        </button>
      </div>
    );
  }

  const RESULT_STYLE: Record<string, { label: string; color: string }> = {
    success: { label: '成功', color: 'var(--bamboo)' },
    fail: { label: '失败', color: 'var(--vermilion)' },
    partial: { label: '部分成功', color: 'var(--bronze)' },
  };
  const rs = RESULT_STYLE[trial.result];

  const handleAddParam = () => {
    if (!newKey.trim()) return;
    setParameters(prev => ({ ...prev, [newKey.trim()]: newValue.trim() }));
    setNewKey('');
    setNewValue('');
  };

  const handleRemoveParam = (key: string) => {
    setParameters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handlePhotoUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const dataUrl = e.target?.result as string;
        setPhotos(prev => [...prev, dataUrl]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handlePhotoUpload(e.dataTransfer.files);
  };

  const handleSave = async () => {
    await updateTrial({ ...trial, parameters, photos, notes });
    navigate('/trials');
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button className="ink-btn ink-btn-ghost" onClick={() => navigate('/trials')}>
          <ArrowLeft size={16} />
        </button>
        <h2 className="font-calligraphy text-2xl" style={{ color: 'var(--paper)' }}>
          第{trial.round}轮试做
        </h2>
        <span
          className="seal-badge text-xs"
          style={{ borderColor: rs.color, color: rs.color }}
        >
          {rs.label}
        </span>
      </div>

      <div className="paper-card p-4 flex items-center gap-6 text-sm">
        <div>
          <span style={{ color: 'var(--smoke-light)' }}>日期：</span>
          <span style={{ color: 'var(--paper)' }}>{new Date(trial.trialDate).toLocaleDateString('zh-CN')}</span>
        </div>
        {(() => {
          const v = recipeVersions.find(rv => rv.id === trial.recipeVersionId);
          return v ? (
            <div>
              <span style={{ color: 'var(--smoke-light)' }}>基于版本：</span>
              <span style={{ color: 'var(--bronze)' }}>第{v.versionNumber}版</span>
            </div>
          ) : null;
        })()}
      </div>

      {trial.result === 'fail' && trial.failReason && (
        <div
          className="paper-card p-4 flex items-center gap-3"
          style={{ borderColor: 'var(--vermilion)', borderWidth: 1 }}
        >
          <XCircle size={20} style={{ color: 'var(--vermilion)' }} />
          <div>
            <div className="text-xs font-bold" style={{ color: 'var(--vermilion)' }}>失败标记</div>
            <div className="text-sm" style={{ color: 'var(--vermilion-light)' }}>
              {trial.failReason}
            </div>
          </div>
        </div>
      )}

      <div className="paper-card p-4">
        <h3 className="font-calligraphy text-lg mb-3" style={{ color: 'var(--paper)' }}>参数记录</h3>
        <div className="flex flex-col gap-2 mb-3">
          {Object.entries(parameters).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: 'var(--bronze)' }}>{key}</span>
              <span className="text-sm" style={{ color: 'var(--smoke-light)' }}>：</span>
              <span className="text-sm flex-1" style={{ color: 'var(--paper)' }}>{value}</span>
              <button onClick={() => handleRemoveParam(key)} className="opacity-50 hover:opacity-100 transition-opacity">
                <Trash2 size={14} style={{ color: 'var(--vermilion)' }} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="ink-input flex-1"
            placeholder="参数名"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
          />
          <input
            className="ink-input flex-1"
            placeholder="参数值"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
          />
          <button className="ink-btn ink-btn-secondary" onClick={handleAddParam}>
            <Plus size={14} /> 添加
          </button>
        </div>
      </div>

      <div className="paper-card p-4">
        <h3 className="font-calligraphy text-lg mb-3" style={{ color: 'var(--paper)' }}>留样照片</h3>

        <div
          className={`drop-zone p-4 flex flex-col items-center gap-2 cursor-pointer ${dragOver ? 'active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera size={32} style={{ color: 'var(--smoke-light)' }} />
          <span className="text-sm" style={{ color: 'var(--smoke-light)' }}>拖放照片或点击上传</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handlePhotoUpload(e.target.files)}
          />
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-3">
            {photos.map((src, i) => (
              <div
                key={i}
                className="relative rounded overflow-hidden"
                style={{
                  border: '2px solid var(--bronze)',
                  boxShadow: '0 0 8px rgba(184,134,11,0.2)',
                  aspectRatio: '1',
                }}
              >
                <img src={src} alt={`留样${i + 1}`} className="w-full h-full object-cover" />
                <button
                  className="absolute top-1 right-1 p-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                  onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                >
                  <Trash2 size={12} style={{ color: 'var(--vermilion)' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="paper-card p-4">
        <h3 className="font-calligraphy text-lg mb-3" style={{ color: 'var(--paper)' }}>备注</h3>
        <textarea
          className="ink-input min-h-[80px] resize-none"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="记录试做心得..."
        />
      </div>

      <div className="flex justify-end gap-3">
        <button className="ink-btn ink-btn-ghost" onClick={() => navigate('/trials')}>取消</button>
        <button className="ink-btn ink-btn-primary" onClick={handleSave}>
          <Save size={16} /> 保存
        </button>
      </div>
    </div>
  );
}
