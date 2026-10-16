import type { Metadata } from "next";
import { Manrope, Noto_Sans_Arabic, Source_Sans_3 } from "next/font/google";
import { FeedbackProvider } from "@/components/Feedback";
import { AuthProvider } from "@/lib/auth-context";
import { CallProvider } from "@/lib/call-context";
import { ThemeProvider } from "@/lib/theme-context";
import { LocaleProvider } from "@/i18n/locale-context";
import { TenantBootstrap } from "@/tenants/TenantBootstrap";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const display = Manrope({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

const arabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Umbrella Express",
  description: "Delivery operations platform",
};

const bootScript = `
(function(){
  try {
    var r=document.documentElement;
    var theme=localStorage.getItem('umbrella-theme');
    if(theme!=='light'&&theme!=='dark') theme='dark';
    if(theme==='dark') r.classList.add('dark');
    else r.classList.remove('dark');
    r.dataset.theme=theme;
    r.style.colorScheme=theme;

    var loc=localStorage.getItem('umbrella-locale');
    if(loc!=='fr'&&loc!=='tn') loc='fr';
    if(loc==='tn'){
      r.lang='ar-TN';
      r.dir='rtl';
      r.classList.add('locale-tn');
      r.classList.remove('locale-fr');
    } else {
      r.lang='fr';
      r.dir='ltr';
      r.classList.add('locale-fr');
      r.classList.remove('locale-tn');
    }
    r.dataset.locale=loc;
  } catch(e){}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body
        className={`${sans.variable} ${display.variable} ${arabic.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <LocaleProvider>
            <AuthProvider>
              <TenantBootstrap>
                <CallProvider>
                  <FeedbackProvider>{children}</FeedbackProvider>
                </CallProvider>
              </TenantBootstrap>
            </AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
