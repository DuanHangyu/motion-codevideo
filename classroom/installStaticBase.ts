import { installStaticBase } from "./staticBase";

// Imported first by main.tsx so the base is set before any lesson module resolves assets.
installStaticBase();
