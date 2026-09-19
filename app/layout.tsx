import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { AppStateProvider } from "@/lib/state";
import { AppShell } from "@/components/layout/AppShell";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <AppStateProvider>
            <AppShell>{children}</AppShell>
          </AppStateProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
