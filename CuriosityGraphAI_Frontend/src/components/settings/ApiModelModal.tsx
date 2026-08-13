import { useState, useEffect } from "react";
import { X, Loader2, Eye, EyeOff } from "lucide-react";
import { getSettings, saveSettings } from "../../api/settings";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiModelModal({ isOpen, onClose }: Props) {
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getSettings()
        .then((s) => {
          if (s.provider) setProvider(s.provider);
          if (s.model) setModel(s.model);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      await saveSettings(provider, model, apiKey || undefined);
      setSuccess(true);
      setApiKey("");
      setTimeout(onClose, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

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
            <div className="text-[16px] font-semibold">API & Model</div>
            <div className="text-text-muted text-[11px] mt-1">
              Configure the LLM used by CuriosityGraphAI.
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-[#192335] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <>
              <div>
                <div className="text-[#c4ccda] text-[11px] font-semibold uppercase tracking-wider mb-3">
                  LLM Configuration
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[#b2bdcd] text-[11px] mb-1.5">
                      Provider
                    </label>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full h-10 border border-border-light rounded-md bg-[#0b121e] text-[#e9edf5] px-3 text-xs focus:border-accent focus:shadow-[0_0_0_2px_rgba(112,76,255,0.12)] outline-none"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="google">Google Gemini</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#b2bdcd] text-[11px] mb-1.5">
                      Model Name
                    </label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder={
                        provider === "openai"
                          ? "gpt-4o-mini"
                          : "gemini-2.0-flash"
                      }
                      className="w-full h-10 border border-border-light rounded-md bg-[#0b121e] text-[#e9edf5] px-3 text-xs focus:border-accent outline-none"
                      required
                    />
                    <div className="text-[#667287] text-[10px] mt-1.5 leading-relaxed">
                      Enter the exact model identifier supported by your
                      provider.
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#b2bdcd] text-[11px] mb-1.5">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key"
                        className="w-full h-10 border border-border-light rounded-md bg-[#0b121e] text-[#e9edf5] px-3 pr-10 text-xs focus:border-accent outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-2 w-7 h-7 rounded flex items-center justify-center text-[#8490a3] hover:bg-[#192335] hover:text-white"
                      >
                        {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <div className="text-[#667287] text-[10px] mt-1.5 leading-relaxed">
                      Your API key is stored securely in backend memory.
                    </div>
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}
              {success && (
                <p className="text-sm text-success">
                  Configuration saved successfully!
                </p>
              )}
            </>
          )}
        </form>

        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-[38px] px-4 border border-border-light rounded-md text-[#b7c0d0] text-[11px] font-semibold hover:bg-[#192335]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="h-[38px] px-4 bg-accent hover:bg-accent-light rounded-md text-white text-[11px] font-semibold disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="animate-spin" size={12} />} Save
            Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
