import "./globals.css";

export const metadata = {
  title: "Visual Social Preview",
  description: "Ferramenta de aprovação de conteúdo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}