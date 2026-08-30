import { Link } from 'react-router-dom';

import { Container } from '@/components/ui/container';

export function PublicFooter() {
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
              TechAFlon
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
                <Link to="/"
                  className="hover:text-primary transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link to="/problems"
                  className="hover:text-primary transition-colors"
                >
                  Battlefields
                </Link>
              </li>
              <li>
                <Link to="/faq"
                  className="hover:text-primary transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/rules"
                  className="hover:text-primary transition-colors"
                >
                  Rules
                </Link>
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
                <Link to="/account"
                  className="hover:text-primary transition-colors"
                >
                  My Account
                </Link>
              </li>
              <li>
                <Link to="/register"
                  className="hover:text-primary transition-colors"
                >
                  Register Team
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section - Copyright */}
        <div className="pt-8 border-t border-steel/20 flex justify-center items-center">
          <div className="text-center">
            <p className="text-steel-bright text-sm">
              © {new Date().getFullYear()} TechAFlon. All rights reserved.
            </p>
            <p className="text-steel text-sm mt-1">
              Developed by{' '}
              <span className="text-primary font-medium">Nawfal Aadil S</span>
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
