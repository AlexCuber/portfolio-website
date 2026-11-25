"""Shared by every test: which browser to start, and a folder for screenshots.
Set HITIT_CHROME to a browser's path to choose one, or to "bundled" for the Chromium that
`playwright install chromium` downloads. Without it the tests use Google Chrome where it is installed in the
usual place, and otherwise the bundled Chromium."""
import os, sys
_known = ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe']
_want = os.environ.get('HITIT_CHROME')
CHROME = None if _want == 'bundled' else _want or next((p for p in _known if os.path.exists(p)), None)
ROOT = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(ROOT, '..', 'shots'); os.makedirs(SHOTS, exist_ok=True)
