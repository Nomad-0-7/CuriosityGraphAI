import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: Props) {
  const [topK, setTopK] = useState(5);
  const [similarity, setSimilarity] = useState(70);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#02050b]/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[620px] max-h-[85vh] overflow-y-auto border border-border-light rounded-xl bg-gradient-to-b from-[#101827] to-[#0d1420] shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border flex justify-between items-center">
          <div>
            <div className="text-[16px] font-semibold">Settings</div>
            <div className="text-text-muted text-[11px] mt-1">
              Customize your CuriosityGraphAI workspace.
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-[#192335] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="text-[#c4ccda] text-[11px] font-semibold uppercase tracking-wider mb-3">
              Retrieval
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[#b2bdcd] text-[11px] mb-1.5">
                  Top K chunks
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="15"
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    className="flex-1 accent-accent"
                  />
                  <span className="w-8 text-right text-[#cfd6e2] text-[11px]">
                    {topK}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-[#b2bdcd] text-[11px] mb-1.5">
                  Similarity threshold
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={similarity}
                    onChange={(e) => setSimilarity(Number(e.target.value))}
                    className="flex-1 accent-accent"
                  />
                  <span className="w-8 text-right text-[#cfd6e2] text-[11px]">
                    {(similarity / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[#c4ccda] text-[11px] font-semibold uppercase tracking-wider mb-3">
              Chat
            </div>
            <label className="flex items-center gap-2 text-[#b8c1d0] text-xs my-2.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-accent" />{" "}
              Show source citations
            </label>
            <label className="flex items-center gap-2 text-[#b8c1d0] text-xs my-2.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-accent" />{" "}
              Show page numbers
            </label>
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-[38px] px-4 border border-border-light rounded-md text-[#b7c0d0] text-[11px] font-semibold hover:bg-[#192335]"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="h-[38px] px-4 bg-accent hover:bg-accent-light rounded-md text-white text-[11px] font-semibold"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
