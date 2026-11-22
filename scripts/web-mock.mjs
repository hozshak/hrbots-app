// Startet die App im Browser mit dem eingebauten Test-Server (MOCK), ohne highrise-bots.com.
// Aufruf: npm run mock  → http://localhost:8095   (gleich wie: EXPO_PUBLIC_API_MOCK=1 npx expo start --web --port 8095)
import { spawn } from 'node:child_process';

const port = process.argv[2] || '8095';
const child = spawn('npx', ['expo', 'start', '--web', '--port', port], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, EXPO_PUBLIC_API_MOCK: '1', BROWSER: 'none' },
});
child.on('exit', (code) => process.exit(code ?? 0));
