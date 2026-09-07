import { useNavigate } from 'react-router-dom';
import { GameLayout } from '../components/layout/GameLayout';
import { TerminalPanel } from '../components/ui/TerminalPanel';
import { CyberButton } from '../components/ui/CyberButton';
import { useAuthStore } from '../store/authStore';

export function Rules() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();

  const handleReturn = () => {
    if (profile?.role === 'HIDER') navigate('/hider');
    else if (profile?.role === 'SEEKER') navigate('/seeker');
    else navigate('/');
  };

  return (
    <GameLayout className="items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <TerminalPanel title="CAMPUS_PROTOCOL // RULES OF ENGAGEMENT">
          <div className="font-mono text-sm flex flex-col gap-6 p-4 text-cyber-text">
            
            <section>
              <h3 className="text-cyber-accent font-bold text-lg mb-2 border-b border-cyber-border pb-1">1. OBJECTIVE</h3>
              <p className="text-cyber-muted">
                You are playing OpenVerse Campus Hide & Seek. Evade or locate opponents across the campus sector.
              </p>
            </section>
            
            <section>
              <h3 className="text-cyber-accent font-bold text-lg mb-2 border-b border-cyber-border pb-1">2. ANOMALIES & CHALLENGES</h3>
              <p className="text-cyber-muted">
                Hiders solve technical CTF anomalies to earn elimination tokens.
                Seekers navigate the tactical campus grid and solve access codes to unlock restricted zones and locate targets.
              </p>
            </section>
            
            <section>
              <h3 className="text-cyber-accent font-bold text-lg mb-2 border-b border-cyber-border pb-1">3. ELIMINATIONS</h3>
              <p className="text-cyber-muted mb-2">
                Successfully decoding a challenge grants one <span className="text-cyber-warning font-bold">ELIMINATION</span> token.
              </p>
              <p className="text-cyber-muted">
                Elimination tokens allow you to target active opponents and revoke their grid access. Eliminated players are immediately removed from play.
              </p>
            </section>

            <section>
              <h3 className="text-cyber-accent font-bold text-lg mb-2 border-b border-cyber-border pb-1">4. RESTRICTIONS</h3>
              <ul className="text-cyber-muted list-disc pl-4 space-y-1">
                <li>Stay within verified active zones.</li>
                <li>Do not share solutions with opposing networks.</li>
                <li>Physical interference is strictly prohibited.</li>
              </ul>
            </section>

          </div>
          
          <div className="mt-6 pt-4 border-t border-cyber-border flex justify-center">
            <CyberButton onClick={handleReturn} variant="secondary">
              ACKNOWLEDGE_AND_RETURN
            </CyberButton>
          </div>
        </TerminalPanel>
      </div>
    </GameLayout>
  );
}
