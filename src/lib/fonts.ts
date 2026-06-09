import { Inter, Orbitron, MuseoModerno } from "next/font/google";

export const inter = Inter({ subsets: ["latin"] });

export const orbitron = Orbitron({ 
  subsets: ["latin"],
  variable: "--font-orbitron",
});

export const museoModerno = MuseoModerno({ 
  subsets: ["latin"],
  variable: "--font-museo-moderno",
  weight: ['400', '500', '600', '700'],
});