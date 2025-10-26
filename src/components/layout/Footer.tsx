import { Instagram, Twitter } from "lucide-react";

// Footer component for consistent layout across all pages
export const Footer = () => {
  return (
    <footer className="bg-[hsl(var(--header-footer))] text-[hsl(var(--header-footer-foreground))] py-8 font-sans">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Brand */}
          <h3 className="text-lg font-etna font-black text-[hsl(var(--header-footer-foreground))] tracking-wider">PARENTAL OF WESTERN CIVILIZATION</h3>
          
          {/* Social Media */}
          <div className="flex space-x-6">
            <a href="#" className="text-[hsl(var(--header-footer-foreground))]/70 hover:text-[hsl(var(--header-footer-foreground))] transition-colors" aria-label="TikTok">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.849-1.532-1.849-1.532-3.338h-2.804v13.5c0 1.38-1.12 2.5-2.5 2.5s-2.5-1.12-2.5-2.5 1.12-2.5 2.5-2.5c.173 0 .342.017.5.05v-2.83c-.164-.01-.33-.02-.5-.02-2.9 0-5.25 2.35-5.25 5.25s2.35 5.25 5.25 5.25 5.25-2.35 5.25-5.25V8.822a7.904 7.904 0 0 0 4.605 1.473v-2.73c-1.422 0-2.713-.573-3.639-1.503z"/>
              </svg>
            </a>
            <a href="#" className="text-[hsl(var(--header-footer-foreground))]/70 hover:text-[hsl(var(--header-footer-foreground))] transition-colors" aria-label="Instagram">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="#" className="text-[hsl(var(--header-footer-foreground))]/70 hover:text-[hsl(var(--header-footer-foreground))] transition-colors" aria-label="Twitter">
              <Twitter className="h-5 w-5" />
            </a>
          </div>
          
          {/* Copyright */}
          <p className="text-[hsl(var(--header-footer-foreground))]/70 text-xs">
            &copy; 2025 TEELITECLUB. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
