import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

import { Container } from '@/components/ui/container';

export function PublicFooter() {
  const [searchParams] = useSearchParams();
  useEffect(() => {
    // Initialize system status from settings
    const init = async () => {
      // In production, fetch from /api/settings/public
      // For now, set default
    };
    init();
  }, [searchParams]);

  return (
    <footer
      className="mt-auto border-t border-steel/30 bg-background-elevated py-12 sm:py-16"
    >
      <Container>
        {/* Top Section - Description & Links */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 mb-12">
          {/* Event Description */}
          <div>
            <h3 className="text-xl font-display font-bold text-foreground mb-4">
              TechaFlon
            </h3>
            <p className="text-steel-bright text-sm leading-relaxed">
              A futuristic command center experience where teams build technology
              solutions to survive the technological apocalypse. 48 hours. One
              battlefield. Infinite possibilities.
            </p>
          </div>

          {/* Learn Links */}
          <div>
            <h4 className="text-sm font-medium text-primary uppercase tracking-wider mb-3">
              LEARN
            </h4>
            <ul className="space-y-2 text-steel-bright text-sm">
              <li>
                <a href="/"
                  className="hover:text-primary transition-colors"
                >
                  Home
                </a>
              </li>
              <li>
                <a href="/problems"
                  className="hover:text-primary transition-colors"
                >
                  Battlefields
                </a>
              </li>
              <li>
                <a href="/faq"
                  className="hover:text-primary transition-colors"
                >
                  FAQ
                </a>
              </li>
              <li>
                <a href="/rules"
                  className="hover:text-primary transition-colors"
                >
                  Rules
                </a>
              </li>
            </ul>
          </div>

          {/* Account Links */}
          <div>
            <h4 className="text-sm font-medium text-primary uppercase tracking-wider mb-3">
              ACCOUNT
            </h4>
            <ul className="space-y-2 text-steel-bright text-sm">
              <li>
                <a href="/account"
                  className="hover:text-primary transition-colors"
                >
                  My Account
                </a>
              </li>
              <li>
                <a href="/register"
                  className="hover:text-primary transition-colors"
                >
                  Register Team
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section - Copyright */}
        <div className="pt-8 border-t border-steel/20 flex justify-center items-center">
          {/* Copyright */}
          <div className="text-center sm:text-left">
            <p className="text-steel-bright text-sm">
              © {new Date().getFullYear()}                TechaFlon. All rights reserved.
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}