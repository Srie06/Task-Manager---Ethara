import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Team Task Manager",
  description: "Full-stack team task manager"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`w-full ${inter.className}`}>
        {/* full width layout */}
        <main className="w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
