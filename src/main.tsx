import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./lib/theme";
import { ErrorBoundary } from "./components/diagnostics";
import { setupGlobalErrorHandlers } from "./lib/error";
import "./lib/i18n";
import "./index.css";

// 初始化全局错误监听器
setupGlobalErrorHandlers();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
