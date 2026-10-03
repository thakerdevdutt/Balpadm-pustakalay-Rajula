import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Lekh Sangrah:', error, errorInfo);
  }

  private handleClearCacheAndReload = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('lekh_sangrah_issues');
        localStorage.removeItem('lekh_installed_version');
        localStorage.removeItem('lekh_sangrah_cached_version');
        localStorage.removeItem('lekh_sangrah_last_sync_check');
        if (typeof caches !== 'undefined') {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.unregister();
          }
        }
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  private handleHardReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F9F7F2] text-[#1C1917] flex items-center justify-center p-4 font-sans-guj">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-[#E5E1D3] text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold font-serif-guj text-[#1C1917]">
                બ્રાઉઝર કેશ સાફ કરવાની જરૂર છે
              </h2>
              <p className="text-xs sm:text-sm text-[#555044] leading-relaxed">
                આ બ્રાઉઝરમાં અગાઉના વર્ઝનની જૂની કેશ અથવા ડેટા જમા થયેલ હોવાથી ઍપ શરૂ થઈ શકી નથી. નીચેનું બટન દબાવવાથી બધું આપોઆપ રિપેર થઈ જશે:
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="w-full py-3 px-4 rounded-xl bg-[#5B8260] hover:bg-[#486B4D] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>કેશ સાફ કરો અને ફરી શરૂ કરો (Fix & Reload)</span>
              </button>

              <button
                type="button"
                onClick={this.handleHardReload}
                className="w-full py-2 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#555044] font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>સામાન્ય રિલોડ (Reload)</span>
              </button>
            </div>

            {this.state.error?.message && (
              <p className="text-[11px] text-gray-400 font-mono pt-2 break-words">
                વિગત: {this.state.error.message}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
