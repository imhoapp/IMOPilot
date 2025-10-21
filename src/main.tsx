import { StrictMode } from "react";
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from "react-router-dom";
import { NuqsAdapter } from 'nuqs/adapters/react-router';
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from "@/components/theme-provider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <NuqsAdapter>
          <App />
        </NuqsAdapter>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);
