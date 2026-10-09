import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';

export const metadata: Metadata = {
  title: 'THREADLAB | Your Style. Your Canvas. — Premium Custom Apparel',
  description:
    'Design and shop premium heavyweight streetwear, oversized t-shirts, and 400 GSM hoodies with an interactive 2D garment custom studio.',
  keywords: [
    'custom clothing',
    'streetwear india',
    't-shirt customizer',
    'heavyweight hoodies',
    'oversized t-shirts',
    'DTG printing',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-canvas-dark text-foreground antialiased selection:bg-brand-lime selection:text-black">
        <AuthProvider>
          <CartProvider>
            <AnnouncementBar />
            <Header />
            <main className="flex-1">{children}</main>
            <CartDrawer />
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
