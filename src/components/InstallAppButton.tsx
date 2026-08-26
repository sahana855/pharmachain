import { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export default function InstallAppButton() {
  const { canInstall, isInstalled, isIOS, showInstallPrompt } = usePWAInstall();
  const [showIOSTip, setShowIOSTip] = useState(false);

  // If app is already installed, hide the button
  if (isInstalled) return null;

  // iOS Safari doesn't support beforeinstallprompt - show "Add to Home Screen" tip
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSTip(!showIOSTip)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
          title="Install PharmaChain"
        >
          <Download size={16} />
          <span className="hidden sm:block">Install</span>
        </button>

        {showIOSTip && (
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowIOSTip(false)}>
            <div className="glass-card-solid max-w-sm w-full p-6 rounded-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Smartphone size={20} className="text-white" />
                </div>
                <button onClick={() => setShowIOSTip(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Install PharmaChain on iPhone</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 mb-4">
                <li>Tap the <strong>Share</strong> button <span className="inline-block bg-gray-100 rounded px-1.5 py-0.5 text-xs">⎙</span> in Safari</li>
                <li>Tap <strong>Add to Home Screen</strong></li>
                <li>Tap <strong>Add</strong> in the top right</li>
              </ol>
              <p className="text-xs text-gray-400">PharmaChain will appear on your home screen like a native app.</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop/Android with install support
  if (canInstall) {
    return (
      <button
        onClick={showInstallPrompt}
        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 rounded-xl shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300"
      >
        <Download size={16} />
        <span className="hidden sm:block">Install App</span>
        <span className="sm:hidden">Install</span>
      </button>
    );
  }

  return null;
}

