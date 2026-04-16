import React from "react";
import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = "Error inesperado";
  let message = "Algo salio mal. Por favor intenta de nuevo.";

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "Pagina no encontrada" : `Error ${error.status}`;
    message = error.status === 404
      ? "La pagina que buscas no existe o fue movida."
      : error.statusText || message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="p-8 max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2>{title}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Recargar
          </Button>
          <Button size="sm" onClick={() => navigate("/app")}>
            <Home className="w-4 h-4 mr-2" /> Ir al inicio
          </Button>
        </div>
      </Card>
    </div>
  );
}

/** Standalone error page for routes OUTSIDE AppProvider (root level) */
export function RootErrorPage() {
  const error = useRouteError();

  let message = "Algo salio mal al cargar la aplicacion.";
  if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f5efe6] p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-[#0c2340]">Error de Aplicacion</h2>
        <p className="text-sm text-gray-600">{message}</p>
        <button
          onClick={() => window.location.href = "/"}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a7fa8] text-white text-sm hover:bg-[#2596be] transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Volver al inicio
        </button>
      </div>
    </div>
  );
}
