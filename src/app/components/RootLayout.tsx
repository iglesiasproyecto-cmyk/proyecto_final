import { Outlet } from "react-router";
import { AppProvider } from "../store/AppContext";
import React from "react";

class AppProviderErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#f5efe6] p-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
            <h2 className="text-xl font-semibold text-[#0c2340]">Error de inicializacion</h2>
            <p className="text-sm text-gray-600">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.href = "/"}
              className="px-4 py-2 rounded-lg bg-[#1a7fa8] text-white text-sm hover:bg-[#2596be] transition-colors"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function RootLayout() {
  return (
    <AppProviderErrorBoundary>
      <AppProvider>
        <Outlet />
      </AppProvider>
    </AppProviderErrorBoundary>
  );
}
