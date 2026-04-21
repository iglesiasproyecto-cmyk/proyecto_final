import { Navigate } from "react-router";

export function IndexRedirect() {
  return <Navigate to="/app" replace />;
}
