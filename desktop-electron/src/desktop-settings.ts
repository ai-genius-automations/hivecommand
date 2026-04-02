import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

const DESKTOP_SETTINGS_PATH = path.join(homedir(), '.octoally', 'desktop-settings.json');

export function readDesktopSettings(): Record<string, any> {
  try {
    return JSON.parse(fs.readFileSync(DESKTOP_SETTINGS_PATH, 'utf-8'));
  } catch {}
  return {};
}

export function writeDesktopSetting(key: string, value: any) {
  const settings = readDesktopSettings();
  settings[key] = value;
  const dir = path.dirname(DESKTOP_SETTINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DESKTOP_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}
