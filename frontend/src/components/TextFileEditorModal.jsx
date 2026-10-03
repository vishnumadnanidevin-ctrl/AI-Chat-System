import React, { useState } from 'react';
import { FileText, X, Edit3, Check } from 'lucide-react';

export default function TextFileEditorModal({
  isOpen,
  onClose,
  file,
  onSave
}) {
  const [content, setContent] = useState(file?.data || '');

  React.useEffect(() => {
    if (file) {
      setContent(file.data || '');
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const handleSave = () => {
    onSave(file.id, content);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="text-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="editor-modal-header">
          <div className="editor-title-group">
            <FileText size={18} className="text-sky-400" />
            <div>
              <h3>Edit Attached File</h3>
              <span className="editor-file-tag">{file.name}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="text-editor-body">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="text-file-textarea"
            rows={15}
            placeholder="Edit file contents..."
          />
        </div>

        <div className="editor-footer">
          <span className="text-xs text-slate-400">
            {content.length} characters ({content.split('\n').length} lines)
          </span>
          <div className="editor-footer-buttons">
            <button type="button" className="edit-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="edit-btn-resubmit" onClick={handleSave}>
              <Check size={14} />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
